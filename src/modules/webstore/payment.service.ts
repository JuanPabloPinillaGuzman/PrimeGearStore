import { OrderPaymentStatus, PaymentMethod, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { confirmOrderPaidInTransaction } from "@/modules/webstore/order-to-sale.service";
import type { PaymentEventResultDto } from "@/modules/webstore/webstore.dto";
import {
  createOrderPayment,
  findOrderByNumber,
  findOrderPaymentByProviderRef,
  findSaleByOrderIdInNotes,
  updateOrderPayment,
  withTransaction,
} from "@/modules/webstore/webstore.repo";

function toPaymentStatus(status: string): OrderPaymentStatus {
  const normalized = status.trim().toUpperCase();
  if (normalized === "INITIATED") return OrderPaymentStatus.INITIATED;
  if (normalized === "PENDING") return OrderPaymentStatus.PENDING;
  if (normalized === "APPROVED") return OrderPaymentStatus.APPROVED;
  if (normalized === "DECLINED") return OrderPaymentStatus.DECLINED;
  if (normalized === "FAILED") return OrderPaymentStatus.FAILED;
  if (normalized === "REFUNDED") return OrderPaymentStatus.REFUNDED;
  throw new AppError("BAD_REQUEST", 400, "Unsupported payment status.");
}

function parseAmount(value: string) {
  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new AppError("BAD_REQUEST", 400, "Invalid payment amount.");
  }
}

export async function confirmOrderPaid(params: {
  orderId: bigint;
  amount: string;
  paymentReference: string;
  paymentMethod: PaymentMethod;
}) {
  const paymentAmount = parseAmount(params.amount);
  return withTransaction((tx) =>
    confirmOrderPaidInTransaction({
      tx,
      orderId: params.orderId,
      paymentMethod: params.paymentMethod,
      paymentAmount,
      paymentReference: params.paymentReference,
    }),
  );
}

export async function recordPaymentEvent(params: {
  provider: string;
  providerRef: string;
  orderNumber: string;
  amount: string;
  rawPayload?: unknown;
  newStatus: string;
}): Promise<PaymentEventResultDto> {
  return withTransaction(async (tx) => {
    const order = await findOrderByNumber(params.orderNumber, tx);
    if (!order) {
      throw new AppError("NOT_FOUND", 404, "Order not found.");
    }

    const amountDecimal = parseAmount(params.amount);
    if (!order.total.equals(amountDecimal)) {
      throw new AppError("CONFLICT", 409, "Payment amount does not match order total.");
    }

    const paymentStatus = toPaymentStatus(params.newStatus);
    const existingPayment = await findOrderPaymentByProviderRef(
      params.provider,
      params.providerRef,
      tx,
    );

    let payment;
    if (existingPayment) {
      payment = await updateOrderPayment(
        existingPayment.id,
        {
          status: paymentStatus,
          amount: amountDecimal,
          rawPayload: (params.rawPayload ?? null) as Prisma.InputJsonValue,
        },
        tx,
      );
    } else {
      payment = await createOrderPayment(
        {
          orderId: order.id,
          provider: params.provider,
          providerRef: params.providerRef,
          amount: amountDecimal,
          status: paymentStatus,
          rawPayload: (params.rawPayload ?? null) as Prisma.InputJsonValue,
        },
        tx,
      );
    }

    let saleId: string | null = null;
    if (paymentStatus === OrderPaymentStatus.APPROVED) {
      const sale = await confirmOrderPaidInTransaction({
        tx,
        orderId: order.id,
        paymentMethod: PaymentMethod.TRANSFER,
        paymentAmount: amountDecimal,
        paymentReference: params.providerRef,
      });
      saleId = sale.id.toString();
    } else {
      const sale = await findSaleByOrderIdInNotes(order.id, tx);
      saleId = sale?.id.toString() ?? null;
    }

    const updatedOrder = await findOrderByNumber(order.orderNumber, tx);
    if (!updatedOrder) {
      throw new AppError("INTERNAL_ERROR", 500, "Order could not be loaded after payment.");
    }

    return {
      orderNumber: updatedOrder.orderNumber,
      orderStatus: updatedOrder.status,
      paymentStatus: payment.status,
      saleId,
    };
  });
}
