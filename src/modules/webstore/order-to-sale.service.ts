import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { resolveVariantUnitCostForSale } from "@/modules/costing/costing.service";
import { redeemCouponForPaidOrderInTransaction } from "@/modules/coupons/coupons.service";
import { enqueueOrderNotificationEventInTransaction } from "@/modules/notifications/outbox.service";
import {
  applySaleDiscountSnapshot,
  consumeActiveReservations,
  createInventoryMovements,
  createVariantInventoryMovementsForSale,
  createSale,
  createSaleItems,
  createSalePayment,
  findOrderById,
  findSaleByOrderIdInNotes,
  updateOrderStatus,
  withTransaction,
} from "@/modules/webstore/webstore.repo";

function assertAmountMatches(orderTotal: Prisma.Decimal, paymentAmount: Prisma.Decimal) {
  if (!orderTotal.equals(paymentAmount)) {
    throw new AppError("CONFLICT", 409, "Payment amount does not match order total.");
  }
}

export async function confirmOrderPaidInTransaction(params: {
  tx: Prisma.TransactionClient;
  orderId: bigint;
  paymentMethod: PaymentMethod;
  paymentAmount: Prisma.Decimal;
  paymentReference?: string;
}) {
  const { tx, orderId, paymentMethod, paymentAmount, paymentReference } = params;

  await tx.$queryRaw`SELECT id FROM webstore.orders WHERE id = ${orderId} FOR UPDATE`;

  const order = await findOrderById(orderId, tx);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  assertAmountMatches(order.total, paymentAmount);

  const existingSale = await findSaleByOrderIdInNotes(order.id, tx);
  if (existingSale) {
    await redeemCouponForPaidOrderInTransaction({
      tx,
      orderId: order.id,
      customerId: order.customerId ?? undefined,
      couponCode: order.couponCode,
    });
    return existingSale;
  }

  if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAID) {
    throw new AppError("CONFLICT", 409, "Order cannot be confirmed in current status.");
  }

  if (order.items.length === 0) {
    throw new AppError("UNPROCESSABLE", 422, "Order has no items.");
  }

  const now = new Date();
  const activeReservations = order.stockReservations.filter(
    (reservation) => reservation.status === "ACTIVE",
  );

  if (activeReservations.length === 0) {
    throw new AppError("CONFLICT", 409, "Order has no active reservations.");
  }

  const expiredReservation = activeReservations.find((reservation) => reservation.expiresAt <= now);
  if (expiredReservation) {
    throw new AppError("CONFLICT", 409, "Order has expired reservations.");
  }

  const saleNotes = `webstore_order_id=${order.id.toString()}; order_number=${order.orderNumber}`;
  const sale = await createSale(
    {
      customerId: order.customerId ?? undefined,
      branchId: order.branchId ?? undefined,
      currency: order.currency,
      discountTotal: order.discountTotal,
      notes: saleNotes,
    },
    tx,
  );

  const variantCostMap = new Map<string, Prisma.Decimal>();
  for (const item of order.items) {
    if (!item.variantId) continue;
    const key = item.variantId.toString();
    if (variantCostMap.has(key)) continue;
    const cost = await resolveVariantUnitCostForSale({
      tx,
      variantId: item.variantId,
      branchId: order.branchId ?? undefined,
    });
    variantCostMap.set(key, cost);
  }

  await createSaleItems(
    order.items.map((item) => ({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity,
      unitSalePrice: item.unitPriceSnapshot,
      unitCost: item.variantId ? variantCostMap.get(item.variantId.toString()) : new Prisma.Decimal(0),
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
    })),
    tx,
  );

  await applySaleDiscountSnapshot(sale.id, order.discountTotal, tx);

  await createSalePayment(
    {
      saleId: sale.id,
      method: paymentMethod,
      amount: paymentAmount,
      reference: paymentReference,
    },
    tx,
  );

  const variantItems = order.items.filter((item) => item.variantId);
  const productOnlyItems = order.items.filter((item) => !item.variantId);

  if (productOnlyItems.length > 0) {
    await createInventoryMovements(
      productOnlyItems.map((item) => ({
        branchId: order.branchId ?? undefined,
        productId: item.productId,
        quantity: item.quantity,
        referenceId: sale.id,
      })),
      tx,
    );
  }

  if (variantItems.length > 0) {
    await createVariantInventoryMovementsForSale(
      variantItems.map((item) => ({
        branchId: order.branchId ?? undefined,
        variantId: item.variantId as bigint,
        quantity: item.quantity,
        unitCost: variantCostMap.get((item.variantId as bigint).toString()),
        referenceId: sale.id,
      })),
      tx,
    );
  }

  await consumeActiveReservations(order.id, tx);
  await updateOrderStatus(order.id, OrderStatus.PAID, tx);
  await redeemCouponForPaidOrderInTransaction({
    tx,
    orderId: order.id,
    customerId: order.customerId ?? undefined,
    couponCode: order.couponCode,
  });
  await enqueueOrderNotificationEventInTransaction({
    tx,
    orderId: order.id,
    eventType: "PAYMENT_APPROVED",
    payload: {
      paymentReference: paymentReference ?? null,
      paymentMethod,
    },
  });

  const saleAfterCreation = await findSaleByOrderIdInNotes(order.id, tx);
  if (!saleAfterCreation) {
    throw new AppError("INTERNAL_ERROR", 500, "Sale could not be loaded after confirmation.");
  }

  return saleAfterCreation;
}

export async function confirmOrderPaid(params: {
  orderId: bigint;
  paymentMethod: PaymentMethod;
  paymentAmount: Prisma.Decimal;
  paymentReference?: string;
}) {
  return withTransaction((tx) =>
    confirmOrderPaidInTransaction({
      tx,
      orderId: params.orderId,
      paymentMethod: params.paymentMethod,
      paymentAmount: params.paymentAmount,
      paymentReference: params.paymentReference,
    }),
  );
}
