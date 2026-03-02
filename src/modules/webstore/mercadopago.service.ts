import { createHmac, timingSafeEqual } from "node:crypto";

import { OrderPaymentStatus, OrderStatus, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import type {
  MercadoPagoInitInputDto,
  MercadoPagoInitOutputDto,
  MercadoPagoWebhookResultDto,
} from "@/modules/webstore/dto";
import { recordPaymentEvent } from "@/modules/webstore/payment.service";
import {
  createMercadoPagoPreference,
  getMercadoPagoMerchantOrder,
  getMercadoPagoPayment,
  searchMercadoPagoPaymentByExternalReference,
} from "@/modules/webstore/mercadopago.repo";
import {
  createOrderPayment,
  findOrderByNumberForPaymentInit,
  findOrderPaymentByProviderRef,
  updateOrderStatus,
  updateOrderPayment,
  withTransaction,
} from "@/modules/webstore/repo";

type MpWebhookProcessInput = {
  queryType?: string;
  bodyType?: string;
  dataId?: string;
  rawBody: string;
  xSignature: string | null;
  xRequestId: string | null;
};

function toPaymentStatus(status: string): "APPROVED" | "DECLINED" | "PENDING" {
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "accredited") return "APPROVED";
  if (normalized === "rejected" || normalized === "cancelled" || normalized === "charged_back") {
    return "DECLINED";
  }
  return "PENDING";
}

function parseSignatureHeader(value: string | null) {
  if (!value) return null;
  const chunks = value.split(",").map((part) => part.trim());
  const map = new Map<string, string>();
  for (const chunk of chunks) {
    const [key, ...rest] = chunk.split("=");
    if (!key || rest.length === 0) continue;
    map.set(key, rest.join("="));
  }
  return {
    ts: map.get("ts"),
    v1: map.get("v1"),
  };
}

function verifySignature(params: {
  rawBody: string;
  xSignature: string | null;
  secret?: string;
}) {
  const { rawBody, xSignature, secret } = params;
  if (!secret) return { checked: false, valid: true };
  const parsed = parseSignatureHeader(xSignature);
  if (!parsed?.v1) return { checked: true, valid: false };

  const toDigest = (payload: string) =>
    createHmac("sha256", secret).update(payload).digest("hex").toLowerCase();

  const candidates = [toDigest(rawBody)];
  if (parsed.ts) {
    candidates.push(toDigest(`${parsed.ts}.${rawBody}`));
  }

  const signature = Buffer.from(parsed.v1.toLowerCase());
  const valid = candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    if (candidateBuffer.length !== signature.length) return false;
    return timingSafeEqual(candidateBuffer, signature);
  });

  return { checked: true, valid };
}

export async function initMercadoPagoPreference(
  input: MercadoPagoInitInputDto,
): Promise<MercadoPagoInitOutputDto> {
  const order = await findOrderByNumberForPaymentInit(input.orderNumber);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    throw new AppError("CONFLICT", 409, "Order is not available for payment.");
  }

  if (order.items.length === 0) {
    throw new AppError("UNPROCESSABLE", 422, "Order has no items.");
  }

  const preference = await createMercadoPagoPreference({
    orderNumber: order.orderNumber,
    items: order.items.map((item) => ({
      title: `Product #${item.productId}`,
      quantity: Number(item.quantity.toString()),
      unitPrice: Number(item.unitPriceSnapshot.toString()),
    })),
  });

  if (!preference.id || (!preference.init_point && !preference.sandbox_init_point)) {
    throw new AppError("BAD_REQUEST", 400, "Mercado Pago preference response is incomplete.");
  }

  await withTransaction(async (tx) => {
    const existing = await findOrderPaymentByProviderRef("MERCADOPAGO", preference.id, tx);
    if (existing) {
      await updateOrderPayment(
        existing.id,
        {
          status: OrderPaymentStatus.INITIATED,
          amount: order.total,
          rawPayload: preference as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    } else {
      await createOrderPayment(
        {
          orderId: order.id,
          provider: "MERCADOPAGO",
          providerRef: preference.id,
          amount: order.total,
          status: OrderPaymentStatus.INITIATED,
          rawPayload: preference as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    }
  });

  return {
    initPoint: preference.init_point ?? preference.sandbox_init_point ?? "",
    preferenceId: preference.id,
  };
}

export async function processMercadoPagoWebhook(
  input: MpWebhookProcessInput,
): Promise<MercadoPagoWebhookResultDto> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const signature = verifySignature({
    rawBody: input.rawBody,
    xSignature: input.xSignature,
    secret,
  });

  if (signature.checked && !signature.valid) {
    throw new AppError("UNAUTHORIZED", 401, "Invalid Mercado Pago signature.");
  }

  const topic = (input.queryType ?? input.bodyType ?? "payment").toLowerCase();
  const dataId = input.dataId?.trim();
  if (!dataId) {
    throw new AppError("BAD_REQUEST", 400, "Webhook resource id is required.");
  }

  let providerRef = dataId;
  let orderNumber = "";
  let amount = "0";
  let paymentStatus: "APPROVED" | "DECLINED" | "PENDING" = "PENDING";
  let rawPayload: unknown;

  if (topic === "payment") {
    const payment = await getMercadoPagoPayment(dataId);
    providerRef = String(payment.id);
    orderNumber = payment.external_reference ?? "";
    amount = String(payment.transaction_amount ?? 0);
    paymentStatus = toPaymentStatus(payment.status);
    rawPayload = {
      webhook: {
        topic,
        dataId,
      },
      payment,
      headers: {
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
      },
    };
  } else if (topic === "merchant_order") {
    const merchantOrder = await getMercadoPagoMerchantOrder(dataId);
    providerRef = String(merchantOrder.id);
    orderNumber = merchantOrder.external_reference ?? "";
    const approvedPayment = merchantOrder.payments?.find((payment) => payment.status === "approved");
    const fallbackPayment = merchantOrder.payments?.[0];
    const effectivePayment = approvedPayment ?? fallbackPayment;

    paymentStatus = effectivePayment
      ? toPaymentStatus(effectivePayment.status)
      : merchantOrder.order_status === "closed"
        ? "APPROVED"
        : "PENDING";
    amount = String(
      effectivePayment?.transaction_amount ?? merchantOrder.paid_amount ?? 0,
    );
    rawPayload = {
      webhook: {
        topic,
        dataId,
      },
      merchantOrder,
      headers: {
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
      },
    };
  } else {
    throw new AppError("BAD_REQUEST", 400, "Unsupported Mercado Pago topic.");
  }

  if (!orderNumber) {
    throw new AppError("BAD_REQUEST", 400, "Could not resolve order number from Mercado Pago.");
  }

  const eventResult = await recordPaymentEvent({
    provider: "MERCADOPAGO",
    providerRef,
    orderNumber,
    amount,
    rawPayload,
    newStatus: paymentStatus,
  });

  if (!signature.valid) {
    logger.warn(
      {
        provider: "MERCADOPAGO",
        providerRef,
        orderNumber,
      },
      "Webhook processed without signature verification. Resource lookup was used.",
    );
  }

  return {
    processed: true,
    provider: "MERCADOPAGO",
    topic,
    providerRef,
    orderNumber: eventResult.orderNumber,
    paymentStatus: eventResult.paymentStatus,
    orderStatus: eventResult.orderStatus,
    saleId: eventResult.saleId,
  };
}

export async function reconcileMercadoPagoOrderPayment(params: {
  orderNumber: string;
  force?: boolean;
}) {
  const order = await findOrderByNumberForPaymentInit(params.orderNumber);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  const search = await searchMercadoPagoPaymentByExternalReference(order.orderNumber);

  const payment = search.results?.[0];
  if (!payment) {
    throw new AppError(
      "NOT_FOUND",
      404,
      "No Mercado Pago payment found for this order external reference.",
    );
  }

  const providerRef = String(payment.id);
  const paymentStatus = toPaymentStatus(payment.status);
  const amount = String(payment.transaction_amount ?? 0);

  const eventResult = await recordPaymentEvent({
    provider: "MERCADOPAGO",
    providerRef,
    orderNumber: order.orderNumber,
    amount,
    rawPayload: {
      reconcile: true,
      payment,
    },
    newStatus: paymentStatus,
  });

  if (
    paymentStatus === "DECLINED" &&
    params.force &&
    eventResult.orderStatus === "PENDING_PAYMENT"
  ) {
    await withTransaction(async (tx) => {
      await updateOrderStatus(order.id, OrderStatus.CANCELLED, tx);
    });
  }

  return {
    orderNumber: eventResult.orderNumber,
    orderStatus:
      paymentStatus === "DECLINED" && params.force && eventResult.orderStatus === "PENDING_PAYMENT"
        ? "CANCELLED"
        : eventResult.orderStatus,
    paymentStatus: eventResult.paymentStatus,
    saleId: eventResult.saleId ? Number(eventResult.saleId) : undefined,
    message:
      paymentStatus === "APPROVED"
        ? "Order payment reconciled and conversion ensured."
        : "Order payment reconciled without conversion.",
  };
}
