import { OrderStatus, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { evaluateCouponForOrderSubtotal } from "@/modules/coupons/service";
import { enqueueOrderNotificationEventInTransaction } from "@/modules/notifications/outbox.service";
import { getActiveReservedVariantQtyMap, getVariantStockOnHandMap } from "@/modules/variants/repo";
import type {
  AddCartItemInputDto,
  AddCartItemOutputDto,
  ApplyBundleInputDto,
  ApplyBundleOutputDto,
  BundleApplicableOutputDto,
  BundleApplicableQueryDto,
  CancelOrderInputDto,
  CheckoutInputDto,
  CheckoutOutputDto,
  OrderDetailsDto,
  RecoverCartByTokenOutputDto,
} from "@/modules/webstore/dto";
import {
  applyBundleToCart as applyBundleToCartRepo,
  createOpenCart,
  createOrder,
  createOrderItems,
  createStockReservations,
  applyOrderDiscountSnapshot,
  createWebstoreEvent,
  findDefaultValidPrice,
  findDefaultValidPricesByProductIds,
  findDefaultValidVariantPrice,
  findCartBundleForCheckout,
  findCartByRecoveryToken,
  findOpenCartById,
  findOpenCartBySession,
  countInventoryMovementsBySaleId,
  findOrderByNumber,
  findProductById,
  findVariantById,
  findSaleByOrderIdInNotes,
  markCartAsCheckedOut,
  releaseActiveReservations,
  touchCartActivity,
  updateOrderStatus,
  upsertCartItem,
  clearCartRecoveryState,
  listActiveBundlesWithItems,
  withTransaction,
} from "@/modules/webstore/repo";

function generateOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `PG-${datePart}-${timePart}${randomPart}`;
}

function mapOrderDetails(
  order: NonNullable<Awaited<ReturnType<typeof findOrderByNumber>>>,
  sale: Awaited<ReturnType<typeof findSaleByOrderIdInNotes>> | null,
  movementOutCount: number,
): OrderDetailsDto {
  const currentStatus = order.status;
  const timelineOrder: Array<"PAID" | "PACKING" | "SHIPPED" | "DELIVERED"> = [
    "PAID",
    "PACKING",
    "SHIPPED",
    "DELIVERED",
  ];
  const orderRank: Record<string, number> = {
    PAID: 0,
    PACKING: 1,
    SHIPPED: 2,
    DELIVERED: 3,
  };
  const currentRank = orderRank[currentStatus] ?? -1;

  return {
    orderId: order.id.toString(),
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    totals: {
      subtotal: order.subtotal.toString(),
      discountTotal: order.discountTotal.toString(),
      taxTotal: order.taxTotal.toString(),
      shippingTotal: order.shippingTotal.toString(),
      total: order.total.toString(),
    },
    couponCode: order.couponCode ?? null,
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId,
      variantId: item.variantId?.toString() ?? null,
      quantity: item.quantity.toString(),
      unitPriceSnapshot: item.unitPriceSnapshot.toString(),
      discountAmount: item.discountAmount.toString(),
      taxAmount: item.taxAmount.toString(),
      lineSubtotal: item.lineSubtotal.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
    reservations: order.stockReservations.map((reservation) => ({
      id: reservation.id.toString(),
      productId: reservation.productId,
      variantId: reservation.variantId?.toString() ?? null,
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString(),
      quantity: reservation.quantity.toString(),
    })),
    shipment: order.shipments[0]
      ? {
          id: order.shipments[0].id.toString(),
          status: order.shipments[0].status,
          carrier: order.shipments[0].carrier,
          service: order.shipments[0].service,
          trackingNumber: order.shipments[0].trackingNumber,
          shippedAt: order.shipments[0].shippedAt?.toISOString() ?? null,
          deliveredAt: order.shipments[0].deliveredAt?.toISOString() ?? null,
        }
      : null,
    timeline: timelineOrder.map((status, index) => ({
      status,
      reached: index <= currentRank,
    })),
    payment: order.payments[0]
      ? {
          provider: order.payments[0].provider,
          status: order.payments[0].status,
          amount: order.payments[0].amount.toString(),
          providerRef: order.payments[0].providerRef,
          updatedAt: order.payments[0].updatedAt.toISOString(),
        }
      : null,
    sale: sale
      ? {
          saleId: sale.id.toString(),
          status: sale.status,
          total: sale.total.toString(),
          createdAt: sale.saleDate.toISOString(),
          movementOutCount,
        }
      : null,
  };
}

function computeBundleDiscount(
  bundle: {
    discountType: string;
    discountValue: Prisma.Decimal;
  },
  matchedSubtotal: Prisma.Decimal,
) {
  if (bundle.discountType === "PERCENT") {
    return matchedSubtotal.mul(bundle.discountValue).div(100).toDecimalPlaces(2);
  }
  return Prisma.Decimal.min(bundle.discountValue, matchedSubtotal);
}

function isBundleActiveNow(bundle: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  if (!bundle.isActive) return false;
  const now = new Date();
  if (bundle.startsAt && bundle.startsAt > now) return false;
  if (bundle.endsAt && bundle.endsAt < now) return false;
  return true;
}

function buildVariantQtyMap(
  items: Array<{ variantId?: bigint | null; quantity: Prisma.Decimal }>,
) {
  const map = new Map<string, Prisma.Decimal>();
  for (const item of items) {
    if (!item.variantId) continue;
    const key = item.variantId.toString();
    map.set(key, (map.get(key) ?? new Prisma.Decimal(0)).plus(item.quantity));
  }
  return map;
}

async function evaluateApplicableBundles(cartId: string, db?: Prisma.TransactionClient) {
  const cart = await findOpenCartById(cartId, db);
  if (!cart) {
    throw new AppError("NOT_FOUND", 404, "Open cart not found.");
  }
  const bundles = await listActiveBundlesWithItems(db);
  const cartQtyByVariant = buildVariantQtyMap(cart.items);

  const applicable = bundles
    .filter((bundle) => isBundleActiveNow(bundle))
    .map((bundle) => {
      let matchedSubtotal = new Prisma.Decimal(0);
      for (const bundleItem of bundle.items) {
        const inCart = cart.items.find((item) => item.variantId?.toString() === bundleItem.variantId.toString());
        const cartQty = cartQtyByVariant.get(bundleItem.variantId.toString()) ?? new Prisma.Decimal(0);
        if (!inCart) return null;
        if (cartQty.lessThan(bundleItem.quantity)) return null;
        matchedSubtotal = matchedSubtotal.plus(inCart.unitPriceSnapshot.mul(bundleItem.quantity));
      }
      return {
        bundle,
        estimatedDiscount: computeBundleDiscount(bundle, matchedSubtotal),
      };
    })
    .filter((entry): entry is { bundle: (typeof bundles)[number]; estimatedDiscount: Prisma.Decimal } => !!entry);

  return {
    cart,
    applicable,
  };
}

export async function addItemToCart(input: AddCartItemInputDto): Promise<AddCartItemOutputDto> {
  let variantIdBigInt: bigint | undefined;
  let resolvedProductId = input.productId;
  if (typeof input.variantId === "number") {
    variantIdBigInt = BigInt(input.variantId);
    const variant = await findVariantById(variantIdBigInt);
    if (!variant || !variant.isActive) {
      throw new AppError("NOT_FOUND", 404, "Variant not found for product.");
    }
    if (resolvedProductId && variant.productId !== resolvedProductId) {
      throw new AppError("NOT_FOUND", 404, "Variant not found for product.");
    }
    resolvedProductId = variant.productId;
  }

  if (!resolvedProductId) {
    throw new AppError("BAD_REQUEST", 400, "productId could not be resolved.");
  }

  const product = await findProductById(resolvedProductId);
  if (!product || !product.isActive) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }

  const price = variantIdBigInt
    ? await findDefaultValidVariantPrice(variantIdBigInt)
    : await findDefaultValidPrice(resolvedProductId);
  if (!price) {
    throw new AppError("UNPROCESSABLE", 422, "No valid price found for product.");
  }

  let cartId = input.cartId;
  if (cartId) {
    const existingById = await findOpenCartById(cartId);
    if (!existingById) {
      throw new AppError("NOT_FOUND", 404, "Open cart not found.");
    }
  } else if (input.sessionId) {
    const existingBySession = await findOpenCartBySession(input.sessionId);
    if (existingBySession) {
      cartId = existingBySession.id;
    } else {
      const createdCart = await createOpenCart(input.sessionId);
      cartId = createdCart.id;
    }
  }

  if (!cartId) {
    throw new AppError("BAD_REQUEST", 400, "cartId or sessionId is required.");
  }

  const item = await upsertCartItem({
    cartId,
    productId: resolvedProductId,
    variantId: variantIdBigInt,
    quantity: new Prisma.Decimal(input.quantity),
    unitPriceSnapshot: price.salePrice,
    currency: price.currency,
  });
  await touchCartActivity(cartId);

  return {
    cartId: item.cartId,
    item: {
      productId: item.productId,
      variantId: item.variantId?.toString() ?? null,
      quantity: item.quantity.toString(),
      unitPriceSnapshot: item.unitPriceSnapshot.toString(),
      currency: item.currency,
    },
  };
}

export async function getRecoverCartByToken(token: string): Promise<RecoverCartByTokenOutputDto> {
  const cart = await findCartByRecoveryToken(token);
  if (!cart) {
    throw new AppError("NOT_FOUND", 404, "Recovery cart not found.");
  }

  const maxAgeDays = Number(process.env.CART_RECOVERY_TOKEN_DAYS ?? "7");
  if (cart.recoverySentAt) {
    const expiresAt = new Date(cart.recoverySentAt.getTime() + maxAgeDays * 24 * 60 * 60 * 1000);
    if (expiresAt < new Date()) {
      throw new AppError("CONFLICT", 409, "Recovery token expired.");
    }
  }

  await touchCartActivity(cart.id);
  await clearCartRecoveryState(cart.id);
  await createWebstoreEvent({
    eventName: "CART_RECOVERED",
    entityType: "CART",
    entityId: cart.id,
    cartId: cart.id,
    payload: { tokenRecovered: true } as Prisma.InputJsonValue,
  });

  return {
    cartId: cart.id,
    items: cart.items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId,
      variantId: item.variantId?.toString() ?? null,
      quantity: item.quantity.toString(),
      unitPriceSnapshot: item.unitPriceSnapshot.toString(),
      currency: item.currency,
    })),
  };
}

export async function getApplicableBundles(
  query: BundleApplicableQueryDto,
): Promise<BundleApplicableOutputDto> {
  const { cart, applicable } = await evaluateApplicableBundles(query.cartId);
  return {
    cartId: cart.id,
    bundles: applicable.map(({ bundle, estimatedDiscount }) => ({
      bundleId: bundle.id.toString(),
      name: bundle.name,
      discountType: bundle.discountType,
      discountValue: bundle.discountValue.toString(),
      estimatedDiscount: estimatedDiscount.toString(),
    })),
  };
}

export async function applyBundleToCart(input: ApplyBundleInputDto): Promise<ApplyBundleOutputDto> {
  const bundleId = BigInt(input.bundleId);
  return withTransaction(async (tx) => {
    const { applicable } = await evaluateApplicableBundles(input.cartId, tx);
    const selected = applicable.find((entry) => entry.bundle.id === bundleId);
    if (!selected) {
      throw new AppError("UNPROCESSABLE", 422, "Bundle is not applicable to cart.");
    }

    await applyBundleToCartRepo(input.cartId, bundleId, tx);
    await createWebstoreEvent(
      {
        eventName: "BUNDLE_APPLIED",
        entityType: "CART",
        entityId: input.cartId,
        cartId: input.cartId,
        payload: {
          bundleId: bundleId.toString(),
          estimatedDiscount: selected.estimatedDiscount.toString(),
        } as Prisma.InputJsonValue,
      },
      tx,
    );

    return {
      cartId: input.cartId,
      bundleId: bundleId.toString(),
      applied: true,
    };
  });
}

export async function checkoutFromCart(input: CheckoutInputDto): Promise<CheckoutOutputDto> {
  return withTransaction(async (tx) => {
    const cart = await findOpenCartById(input.cartId, tx);
    if (!cart) {
      throw new AppError("NOT_FOUND", 404, "Open cart not found.");
    }

    if (cart.items.length === 0) {
      throw new AppError("UNPROCESSABLE", 422, "Cart has no items.");
    }

    const uniqueProductIds = [...new Set(cart.items.map((item) => item.productId))];
    const pricesByProduct = await findDefaultValidPricesByProductIds(uniqueProductIds, tx);

    const productIdsWithoutVariant = new Set(
      cart.items.filter((item) => !item.variantId).map((item) => item.productId),
    );

    for (const productId of productIdsWithoutVariant) {
      if (!pricesByProduct.has(productId)) {
        throw new AppError(
          "UNPROCESSABLE",
          422,
          `No valid default price found for product ${productId}.`,
        );
      }
    }

    const orderHeader = await createOrder(
      {
        orderNumber: generateOrderNumber(),
        customerId: input.customerId ?? cart.customerId ?? undefined,
        branchId: input.branchId,
        notes: input.notes,
        couponCode: input.couponCode?.trim().toUpperCase() || undefined,
      },
      tx,
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    let bundleSnapshot: CheckoutOutputDto["bundle"] = null;

    const variantIdsInCart = [...new Set(cart.items.map((item) => item.variantId).filter(Boolean))] as bigint[];
    if (variantIdsInCart.length > 0) {
      const [stockMap, reservedMap] = await Promise.all([
        getVariantStockOnHandMap(variantIdsInCart, { branchId: input.branchId }, tx),
        getActiveReservedVariantQtyMap(variantIdsInCart, { branchId: input.branchId }, tx),
      ]);

      const requiredByVariant = new Map<string, Prisma.Decimal>();
      for (const item of cart.items) {
        if (!item.variantId) continue;
        const key = item.variantId.toString();
        requiredByVariant.set(
          key,
          (requiredByVariant.get(key) ?? new Prisma.Decimal(0)).plus(item.quantity),
        );
      }

      for (const [variantKey, requiredQty] of requiredByVariant) {
        const stock = stockMap.get(variantKey) ?? new Prisma.Decimal(0);
        const reserved = reservedMap.get(variantKey) ?? new Prisma.Decimal(0);
        const available = stock.minus(reserved);
        if (available.lessThan(requiredQty) || available.lessThanOrEqualTo(0)) {
          throw new AppError(
            "CONFLICT",
            409,
            `Insufficient stock for variant ${variantKey}. Available ${available.toString()}, required ${requiredQty.toString()}.`,
          );
        }
      }
    }

    const orderItemsToCreate = await Promise.all(
      cart.items.map(async (item) => {
        const price = item.variantId
          ? await findDefaultValidVariantPrice(item.variantId, tx)
          : pricesByProduct.get(item.productId) ?? null;

        if (!price) {
          throw new AppError("UNPROCESSABLE", 422, "Missing valid price for cart item.");
        }

        return {
          orderId: orderHeader.id,
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
          unitPriceSnapshot: price.salePrice,
          currency: price.currency,
        };
      }),
    );

    await createOrderItems(orderItemsToCreate, tx);

    const subtotal = orderItemsToCreate.reduce(
      (acc, item) => acc.plus(item.unitPriceSnapshot.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const cartBundle = await findCartBundleForCheckout(cart.id, tx);
    let bundleDiscount = new Prisma.Decimal(0);
    if (cartBundle?.appliedBundle && isBundleActiveNow(cartBundle.appliedBundle)) {
      let matchedSubtotal = new Prisma.Decimal(0);
      let applicable = true;
      for (const bundleItem of cartBundle.appliedBundle.items) {
        const found = orderItemsToCreate.find(
          (item) => item.variantId?.toString() === bundleItem.variantId.toString(),
        );
        if (!found || found.quantity.lessThan(bundleItem.quantity)) {
          applicable = false;
          break;
        }
        matchedSubtotal = matchedSubtotal.plus(found.unitPriceSnapshot.mul(bundleItem.quantity));
      }
      if (applicable) {
        bundleDiscount = computeBundleDiscount(cartBundle.appliedBundle, matchedSubtotal);
        bundleSnapshot = {
          bundleId: cartBundle.appliedBundle.id.toString(),
          name: cartBundle.appliedBundle.name,
          discountAmount: bundleDiscount.toString(),
          discountType: cartBundle.appliedBundle.discountType,
        };
        await createWebstoreEvent(
          {
            eventName: "CART_BUNDLE_APPLIED",
            entityType: "ORDER",
            entityId: orderHeader.id.toString(),
            cartId: cart.id,
            orderId: orderHeader.id,
            payload: {
              bundleId: cartBundle.appliedBundle.id.toString(),
              discountAmount: bundleDiscount.toString(),
            } as Prisma.InputJsonValue,
          },
          tx,
        );
      }
    }
    const couponEval = await evaluateCouponForOrderSubtotal({
      couponCode: input.couponCode,
      subtotal,
    });
    const totalDiscount = Prisma.Decimal.min(subtotal, couponEval.discountTotal.plus(bundleDiscount));
    await applyOrderDiscountSnapshot(orderHeader.id, totalDiscount, tx);

    await createStockReservations(
      cart.items.map((item) => ({
        orderId: orderHeader.id,
        branchId: input.branchId,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        expiresAt,
      })),
      tx,
    );

    await markCartAsCheckedOut(cart.id, tx);
    await enqueueOrderNotificationEventInTransaction({
      tx,
      orderId: orderHeader.id,
      eventType: "ORDER_CREATED",
    });

    const updatedOrder = await findOrderByNumber(orderHeader.orderNumber, tx);
    if (!updatedOrder) {
      throw new AppError("INTERNAL_ERROR", 500, "Order could not be loaded after checkout.");
    }

    return {
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id.toString(),
      status: updatedOrder.status,
      totals: {
        subtotal: updatedOrder.subtotal.toString(),
        discountTotal: updatedOrder.discountTotal.toString(),
        taxTotal: updatedOrder.taxTotal.toString(),
        shippingTotal: updatedOrder.shippingTotal.toString(),
        total: updatedOrder.total.toString(),
        currency: updatedOrder.currency,
      },
      expiresAt,
      couponCode: updatedOrder.couponCode ?? null,
      bundle: bundleSnapshot,
    };
  }).then((result) => ({
    ...result,
    expiresAt: result.expiresAt.toISOString(),
  }));
}

export async function getOrderDetailsByNumber(orderNumber: string): Promise<OrderDetailsDto> {
  const order = await findOrderByNumber(orderNumber);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  const sale = await findSaleByOrderIdInNotes(order.id);
  const movementOutCount = sale ? await countInventoryMovementsBySaleId(sale.id) : 0;
  return mapOrderDetails(order, sale, movementOutCount);
}

export async function cancelOrderByNumber(input: CancelOrderInputDto): Promise<OrderDetailsDto> {
  return withTransaction(async (tx) => {
    const order = await findOrderByNumber(input.orderNumber, tx);
    if (!order) {
      throw new AppError("NOT_FOUND", 404, "Order not found.");
    }

    if (order.status !== OrderStatus.DRAFT && order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new AppError("CONFLICT", 409, "Order cannot be cancelled in current status.");
    }

    await updateOrderStatus(order.id, OrderStatus.CANCELLED, tx);
    await releaseActiveReservations(order.id, tx);

    const updatedOrder = await findOrderByNumber(input.orderNumber, tx);
    if (!updatedOrder) {
      throw new AppError("INTERNAL_ERROR", 500, "Order could not be loaded after cancellation.");
    }

    const sale = await findSaleByOrderIdInNotes(updatedOrder.id, tx);
    const movementOutCount = sale ? await countInventoryMovementsBySaleId(sale.id, tx) : 0;
    return mapOrderDetails(updatedOrder, sale, movementOutCount);
  });
}
