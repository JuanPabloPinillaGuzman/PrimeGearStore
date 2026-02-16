import { OrderStatus, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import type {
  AddCartItemInputDto,
  AddCartItemOutputDto,
  CancelOrderInputDto,
  CheckoutInputDto,
  CheckoutOutputDto,
  OrderDetailsDto,
} from "@/modules/webstore/dto";
import {
  createOpenCart,
  createOrder,
  createOrderItems,
  createStockReservations,
  findDefaultValidPrice,
  findDefaultValidPricesByProductIds,
  findOpenCartById,
  findOpenCartBySession,
  findOrderByNumber,
  findProductById,
  markCartAsCheckedOut,
  releaseActiveReservations,
  updateOrderStatus,
  upsertCartItem,
  withTransaction,
} from "@/modules/webstore/repo";

function generateOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `PG-${datePart}-${timePart}${randomPart}`;
}

function mapOrderDetails(order: NonNullable<Awaited<ReturnType<typeof findOrderByNumber>>>): OrderDetailsDto {
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
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId,
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
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString(),
      quantity: reservation.quantity.toString(),
    })),
    shipment: order.shipments[0]
      ? {
          id: order.shipments[0].id.toString(),
          status: order.shipments[0].status,
          trackingNumber: order.shipments[0].trackingNumber,
        }
      : null,
  };
}

export async function addItemToCart(input: AddCartItemInputDto): Promise<AddCartItemOutputDto> {
  const product = await findProductById(input.productId);
  if (!product || !product.isActive) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }

  const price = await findDefaultValidPrice(input.productId);
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
    productId: input.productId,
    quantity: new Prisma.Decimal(input.quantity),
    unitPriceSnapshot: price.salePrice,
    currency: price.currency,
  });

  return {
    cartId: item.cartId,
    item: {
      productId: item.productId,
      quantity: item.quantity.toString(),
      unitPriceSnapshot: item.unitPriceSnapshot.toString(),
      currency: item.currency,
    },
  };
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

    for (const productId of uniqueProductIds) {
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
      },
      tx,
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await createOrderItems(
      cart.items.map((item) => {
        const price = pricesByProduct.get(item.productId);
        if (!price) {
          throw new AppError("UNPROCESSABLE", 422, "Missing valid product price.");
        }

        return {
          orderId: orderHeader.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceSnapshot: price.salePrice,
          currency: price.currency,
        };
      }),
      tx,
    );

    await createStockReservations(
      cart.items.map((item) => ({
        orderId: orderHeader.id,
        branchId: input.branchId,
        productId: item.productId,
        quantity: item.quantity,
        expiresAt,
      })),
      tx,
    );

    await markCartAsCheckedOut(cart.id, tx);

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

  return mapOrderDetails(order);
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

    return mapOrderDetails(updatedOrder);
  });
}
