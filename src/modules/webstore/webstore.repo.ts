import {
  CartStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  Prisma,
  SaleStatus,
  StockMovementType,
  StockReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findOpenCartById(cartId: string, db: DbClient = prisma) {
  return db.cart.findFirst({
    where: {
      id: cartId,
      status: CartStatus.OPEN,
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      appliedBundleId: true,
      lastActivityAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true,
          unitPriceSnapshot: true,
          currency: true,
        },
      },
    },
  });
}

export async function findOpenCartBySession(sessionId: string, db: DbClient = prisma) {
  return db.cart.findFirst({
    where: {
      sessionId,
      status: CartStatus.OPEN,
    },
    select: {
      id: true,
      sessionId: true,
      status: true,
    },
  });
}

export async function findCartByIdForView(cartId: string, db: DbClient = prisma) {
  return db.cart.findUnique({
    where: { id: cartId },
    select: {
      id: true,
      status: true,
      appliedBundle: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true,
          unitPriceSnapshot: true,
          currency: true,
          product: {
            select: {
              name: true,
            },
          },
          variant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function findCartItemById(itemId: bigint, db: DbClient = prisma) {
  return db.cartItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      cartId: true,
    },
  });
}

export async function updateCartItemQuantity(
  itemId: bigint,
  quantity: Prisma.Decimal,
  db: DbClient = prisma,
) {
  return db.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    select: { id: true, cartId: true },
  });
}

export async function deleteCartItemById(itemId: bigint, db: DbClient = prisma) {
  return db.cartItem.delete({
    where: { id: itemId },
    select: { id: true, cartId: true },
  });
}

export async function createOpenCart(sessionId?: string, db: DbClient = prisma) {
  return db.cart.create({
    data: {
      sessionId,
      status: CartStatus.OPEN,
      lastActivityAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}

export async function touchCartActivity(cartId: string, db: DbClient = prisma) {
  return db.cart.update({
    where: { id: cartId },
    data: {
      lastActivityAt: new Date(),
    },
    select: { id: true, lastActivityAt: true },
  });
}

export async function findProductById(productId: number, db: DbClient = prisma) {
  return db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isActive: true,
    },
  });
}

export async function findVariantById(variantId: bigint, db: DbClient = prisma) {
  return db.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      productId: true,
      isActive: true,
    },
  });
}

export async function findDefaultValidPrice(productId: number, db: DbClient = prisma) {
  const today = new Date();

  return db.productPrice.findFirst({
    where: {
      productId,
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      priceList: {
        isDefault: true,
      },
    },
    orderBy: {
      validFrom: "desc",
    },
    select: {
      salePrice: true,
      currency: true,
    },
  });
}

export async function findDefaultValidVariantPrice(variantId: bigint, db: DbClient = prisma) {
  const today = new Date();

  return db.variantPrice.findFirst({
    where: {
      variantId,
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      priceList: {
        isDefault: true,
      },
    },
    orderBy: {
      validFrom: "desc",
    },
    select: {
      salePrice: true,
      currency: true,
    },
  });
}

export async function findDefaultValidPricesByProductIds(productIds: number[], db: DbClient) {
  const prices = await Promise.all(
    productIds.map(async (productId) => ({
      productId,
      price: await findDefaultValidPrice(productId, db),
    })),
  );

  return new Map(
    prices
      .filter((entry) => entry.price)
      .map((entry) => [entry.productId, entry.price as NonNullable<typeof entry.price>]),
  );
}

export async function upsertCartItem(
  params: {
    cartId: string;
    productId: number;
    variantId?: bigint;
    quantity: Prisma.Decimal;
    unitPriceSnapshot: Prisma.Decimal;
    currency: string;
  },
  db: DbClient = prisma,
) {
  const existing = await db.cartItem.findFirst({
    where: {
      cartId: params.cartId,
      productId: params.productId,
      variantId: params.variantId ?? null,
    },
    select: { id: true },
  });

  if (existing) {
    return db.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: {
          increment: params.quantity,
        },
        unitPriceSnapshot: params.unitPriceSnapshot,
        currency: params.currency,
      },
      select: {
        cartId: true,
        productId: true,
        variantId: true,
        quantity: true,
        unitPriceSnapshot: true,
        currency: true,
      },
    });
  }

  return db.cartItem.create({
    data: {
      cartId: params.cartId,
      productId: params.productId,
      variantId: params.variantId,
      quantity: params.quantity,
      unitPriceSnapshot: params.unitPriceSnapshot,
      currency: params.currency,
    },
    select: {
      cartId: true,
      productId: true,
      variantId: true,
      quantity: true,
      unitPriceSnapshot: true,
      currency: true,
    },
  });
}

export async function createOrder(
  data: {
    orderNumber: string;
    customerId?: number;
    branchId?: number;
    notes?: string;
    couponCode?: string;
  },
  db: DbClient,
) {
  return db.order.create({
    data: {
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      branchId: data.branchId,
      notes: data.notes,
      couponCode: data.couponCode,
      status: OrderStatus.PENDING_PAYMENT,
      currency: "COP",
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
    },
  });
}

export async function applyOrderDiscountSnapshot(
  orderId: bigint,
  discountTotal: Prisma.Decimal,
  db: DbClient,
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      subtotal: true,
      taxTotal: true,
      shippingTotal: true,
    },
  });

  if (!order) return null;

  const total = order.subtotal.minus(discountTotal).plus(order.taxTotal).plus(order.shippingTotal);

  return db.order.update({
    where: { id: orderId },
    data: {
      discountTotal,
      total,
    },
    select: {
      id: true,
      discountTotal: true,
      total: true,
    },
  });
}

export async function createOrderItems(
  data: Array<{
    orderId: bigint;
    productId: number;
    variantId?: bigint;
    quantity: Prisma.Decimal;
    unitPriceSnapshot: Prisma.Decimal;
    currency: string;
  }>,
  db: DbClient,
) {
  return db.orderItem.createMany({
    data: data.map((item) => ({
      orderId: item.orderId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
      unitPriceSnapshot: item.unitPriceSnapshot,
      discountAmount: new Prisma.Decimal(0),
      taxAmount: new Prisma.Decimal(0),
      currency: item.currency,
    })),
  });
}

export async function createStockReservations(
  data: Array<{
    orderId: bigint;
    branchId?: number;
    productId: number;
    variantId?: bigint;
    quantity: Prisma.Decimal;
    expiresAt: Date;
  }>,
  db: DbClient,
) {
  return db.stockReservation.createMany({
    data: data.map((reservation) => ({
      orderId: reservation.orderId,
      branchId: reservation.branchId,
      productId: reservation.productId,
      variantId: reservation.variantId,
      quantity: reservation.quantity,
      status: StockReservationStatus.ACTIVE,
      expiresAt: reservation.expiresAt,
    })),
  });
}

export async function markCartAsCheckedOut(cartId: string, db: DbClient) {
  return db.cart.update({
    where: { id: cartId },
    data: { status: CartStatus.CHECKED_OUT, recoveryToken: null, recoverySentAt: null },
  });
}

export async function findCartByRecoveryToken(token: string, db: DbClient = prisma) {
  return db.cart.findFirst({
    where: {
      recoveryToken: token,
      status: CartStatus.OPEN,
    },
    select: {
      id: true,
      recoverySentAt: true,
      lastActivityAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true,
          unitPriceSnapshot: true,
          currency: true,
        },
      },
    },
  });
}

export async function listAbandonedOpenCartsForRecovery(params: {
  inactiveBefore: Date;
  limit: number;
  db?: DbClient;
}) {
  const db = params.db ?? prisma;
  return db.$queryRaw<
    Array<{
      cart_id: string;
      customer_email: string | null;
      customer_id: number | null;
      last_activity_at: Date;
    }>
  >(Prisma.sql`
    SELECT
      c.id AS cart_id,
      c.customer_id,
      cu.email::text AS customer_email,
      c.last_activity_at
    FROM webstore.carts c
    LEFT JOIN inventory.customers cu ON cu.id = c.customer_id
    WHERE c.status = 'OPEN'::webstore.cart_status
      AND c.last_activity_at < ${params.inactiveBefore}
      AND c.recovery_sent_at IS NULL
    ORDER BY c.last_activity_at ASC
    LIMIT ${params.limit}
  `);
}

export async function setCartRecoveryToken(
  cartId: string,
  data: { recoveryToken: string; recoverySentAt?: Date },
  db: DbClient,
) {
  return db.cart.update({
    where: { id: cartId },
    data: {
      recoveryToken: data.recoveryToken,
      recoverySentAt: data.recoverySentAt ?? new Date(),
    },
    select: { id: true, recoveryToken: true, recoverySentAt: true },
  });
}

export async function clearCartRecoveryState(cartId: string, db: DbClient = prisma) {
  return db.cart.update({
    where: { id: cartId },
    data: {
      recoveryToken: null,
      recoverySentAt: null,
      lastActivityAt: new Date(),
    },
  });
}

export async function createWebstoreEvent(
  data: {
    eventName: string;
    entityType: "CART" | "ORDER";
    entityId: string;
    payload?: Prisma.InputJsonValue;
    cartId?: string;
    orderId?: bigint;
  },
  db: DbClient = prisma,
) {
  return db.event.create({
    data: {
      eventName: data.eventName,
      entityType: data.entityType,
      entityId: data.entityId,
      payload: data.payload,
      cartId: data.cartId,
      orderId: data.orderId,
    },
  });
}

export async function findCartBundleForCheckout(cartId: string, db: DbClient = prisma) {
  return db.cart.findUnique({
    where: { id: cartId },
    select: {
      appliedBundleId: true,
      appliedBundle: {
        select: {
          id: true,
          name: true,
          isActive: true,
          discountType: true,
          discountValue: true,
          startsAt: true,
          endsAt: true,
          items: {
            select: {
              variantId: true,
              quantity: true,
            },
          },
        },
      },
    },
  });
}

export async function applyBundleToCart(cartId: string, bundleId: bigint, db: DbClient = prisma) {
  return db.cart.update({
    where: { id: cartId },
    data: {
      appliedBundleId: bundleId,
      lastActivityAt: new Date(),
    },
    select: { id: true, appliedBundleId: true },
  });
}

export async function listActiveBundlesWithItems(db: DbClient = prisma) {
  return db.bundle.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      discountType: true,
      discountValue: true,
      startsAt: true,
      endsAt: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });
}

export async function findOrderByNumber(orderNumber: string, db: DbClient = prisma) {
  return db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      stockReservations: true,
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}

export async function findOrderByNumberForPaymentInit(orderNumber: string, db: DbClient = prisma) {
  return db.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPriceSnapshot: true,
        },
      },
    },
  });
}

export async function findOrderById(orderId: bigint, db: DbClient) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      stockReservations: true,
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function findOrderPaymentByProviderRef(
  provider: string,
  providerRef: string,
  db: DbClient,
) {
  return db.orderPayment.findFirst({
    where: {
      provider,
      providerRef,
    },
  });
}

export async function createOrderPayment(
  data: {
    orderId: bigint;
    provider: string;
    providerRef: string;
    amount: Prisma.Decimal;
    status: OrderPaymentStatus;
    rawPayload?: Prisma.InputJsonValue;
  },
  db: DbClient,
) {
  return db.orderPayment.create({
    data: {
      orderId: data.orderId,
      provider: data.provider,
      providerRef: data.providerRef,
      amount: data.amount,
      status: data.status,
      currency: "COP",
      rawPayload: data.rawPayload,
    },
  });
}

export async function updateOrderPayment(
  paymentId: bigint,
  data: {
    status: OrderPaymentStatus;
    amount: Prisma.Decimal;
    rawPayload?: Prisma.InputJsonValue;
  },
  db: DbClient,
) {
  return db.orderPayment.update({
    where: {
      id: paymentId,
    },
    data: {
      status: data.status,
      amount: data.amount,
      rawPayload: data.rawPayload,
    },
  });
}

export async function updateOrderStatus(orderId: bigint, status: OrderStatus, db: DbClient) {
  return db.order.update({
    where: { id: orderId },
    data: { status },
  });
}

export async function releaseActiveReservations(orderId: bigint, db: DbClient) {
  return db.stockReservation.updateMany({
    where: {
      orderId,
      status: StockReservationStatus.ACTIVE,
    },
    data: {
      status: StockReservationStatus.RELEASED,
    },
  });
}

export async function consumeActiveReservations(orderId: bigint, db: DbClient) {
  return db.stockReservation.updateMany({
    where: {
      orderId,
      status: StockReservationStatus.ACTIVE,
    },
    data: {
      status: StockReservationStatus.CONSUMED,
    },
  });
}

export async function findExpiredActiveReservations(now: Date, db: DbClient) {
  return db.stockReservation.findMany({
    where: {
      status: StockReservationStatus.ACTIVE,
      expiresAt: {
        lt: now,
      },
    },
    select: {
      id: true,
      orderId: true,
    },
  });
}

export async function expireReservationsByIds(reservationIds: bigint[], db: DbClient) {
  return db.stockReservation.updateMany({
    where: {
      id: {
        in: reservationIds,
      },
    },
    data: {
      status: StockReservationStatus.EXPIRED,
    },
  });
}

export async function cancelPendingOrders(orderIds: bigint[], db: DbClient) {
  return db.order.updateMany({
    where: {
      id: {
        in: orderIds,
      },
      status: OrderStatus.PENDING_PAYMENT,
    },
    data: {
      status: OrderStatus.CANCELLED,
    },
  });
}

export async function abandonOldOpenCarts(before: Date, db: DbClient) {
  return db.cart.updateMany({
    where: {
      status: CartStatus.OPEN,
      updatedAt: {
        lt: before,
      },
    },
    data: {
      status: CartStatus.ABANDONED,
    },
  });
}

export async function findSaleByOrderIdInNotes(orderId: bigint, db: DbClient = prisma) {
  return db.sale.findFirst({
    where: {
      notes: {
        contains: `webstore_order_id=${orderId.toString()};`,
      },
    },
    orderBy: {
      saleDate: "desc",
    },
  });
}

export async function createSale(
  data: {
    customerId?: number;
    branchId?: number;
    currency: string;
    notes: string;
    discountTotal?: Prisma.Decimal;
  },
  db: DbClient,
) {
  return db.sale.create({
    data: {
      customerId: data.customerId,
      branchId: data.branchId,
      currency: data.currency,
      status: SaleStatus.PAID,
      discountTotal: data.discountTotal,
      notes: data.notes,
    },
  });
}

export async function applySaleDiscountSnapshot(
  saleId: bigint,
  discountTotal: Prisma.Decimal,
  db: DbClient,
) {
  const sale = await db.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      subtotal: true,
      taxTotal: true,
    },
  });
  if (!sale) return null;

  return db.sale.update({
    where: { id: saleId },
    data: {
      discountTotal,
      total: sale.subtotal.minus(discountTotal).plus(sale.taxTotal),
    },
  });
}

export async function createSaleItems(
  data: Array<{
    saleId: bigint;
    productId: number;
    quantity: Prisma.Decimal;
    unitSalePrice: Prisma.Decimal;
    unitCost?: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
  }>,
  db: DbClient,
) {
  return db.saleItem.createMany({
    data: data.map((item) => ({
      saleId: item.saleId,
      productId: item.productId,
      quantity: item.quantity,
      unitSalePrice: item.unitSalePrice,
      unitCost: item.unitCost ?? new Prisma.Decimal(0),
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
    })),
  });
}

export async function createSalePayment(
  data: {
    saleId: bigint;
    method: PaymentMethod;
    amount: Prisma.Decimal;
    reference?: string;
  },
  db: DbClient,
) {
  return db.salePayment.create({
    data: {
      saleId: data.saleId,
      method: data.method,
      amount: data.amount,
      reference: data.reference,
    },
  });
}

export async function createInventoryMovements(
  data: Array<{
    branchId?: number;
    productId: number;
    quantity: Prisma.Decimal;
    referenceId: bigint;
  }>,
  db: DbClient,
) {
  return db.inventoryMovement.createMany({
    data: data.map((movement) => ({
      branchId: movement.branchId,
      productId: movement.productId,
      movementType: StockMovementType.OUT,
      quantity: movement.quantity,
      unitCost: new Prisma.Decimal(0),
      referenceTable: "inventory.sales",
      referenceId: movement.referenceId,
    })),
  });
}

export async function createVariantInventoryMovementsForSale(
  data: Array<{
    branchId?: number;
    variantId: bigint;
    quantity: Prisma.Decimal;
    unitCost?: Prisma.Decimal;
    referenceId: bigint;
  }>,
  db: DbClient,
) {
  return db.variantInventoryMovement.createMany({
    data: data.map((movement) => ({
      branchId: movement.branchId,
      variantId: movement.variantId,
      movementType: StockMovementType.OUT,
      quantity: movement.quantity,
      unitCost: movement.unitCost ?? new Prisma.Decimal(0),
      referenceTable: "inventory.sales",
      referenceId: movement.referenceId,
    })),
  });
}

export async function countInventoryMovementsBySaleId(saleId: bigint, db: DbClient = prisma) {
  return db.inventoryMovement.count({
    where: {
      movementType: StockMovementType.OUT,
      referenceTable: "inventory.sales",
      referenceId: saleId,
    },
  });
}

export function withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(callback);
}
