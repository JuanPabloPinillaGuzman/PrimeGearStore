import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { EmailProvider } from "@/modules/notifications/email.provider";
import type { NotificationEventType, ProcessOutboxResultDto } from "@/modules/notifications/dto";
import {
  countPendingOutbox,
  enqueueCartNotificationOutbox,
  enqueueOrderNotificationOutbox,
  findOrderNotificationContext,
  listPendingOutbox,
  markOutboxFailed,
  markOutboxSent,
} from "@/modules/notifications/outbox.repo";
import { ConsoleEmailProvider } from "@/modules/notifications/providers/console";
import { ResendEmailProvider } from "@/modules/notifications/providers/resend";

function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();
  if (provider === "resend") {
    return new ResendEmailProvider(process.env.RESEND_API_KEY);
  }
  return new ConsoleEmailProvider();
}

function getEmailFrom() {
  return process.env.EMAIL_FROM ?? "noreply@primegear.local";
}

function buildRecipientFallback(orderNumber: string) {
  return `order+${orderNumber}@local.invalid`;
}

function formatCurrency(currency: string, amount: string) {
  return `${currency} ${amount}`;
}

function buildEmailContent(eventType: NotificationEventType, payload: Record<string, unknown>) {
  const orderNumber = String(payload.orderNumber ?? "N/A");
  const total = String(payload.total ?? "0");
  const currency = String(payload.currency ?? "COP");
  const trackingNumber = payload.trackingNumber ? String(payload.trackingNumber) : null;
  const carrier = payload.carrier ? String(payload.carrier) : null;

  if (eventType === "ORDER_CREATED") {
    return {
      subject: `PrimeGearStore: pedido ${orderNumber} creado`,
      text: `Tu pedido ${orderNumber} fue creado. Total: ${formatCurrency(currency, total)}.`,
      html: `<h2>Pedido creado</h2><p>Tu pedido <strong>${orderNumber}</strong> fue creado.</p><p>Total: ${formatCurrency(currency, total)}</p>`,
    };
  }

  if (eventType === "PAYMENT_APPROVED") {
    return {
      subject: `PrimeGearStore: pago aprobado ${orderNumber}`,
      text: `Tu pago del pedido ${orderNumber} fue aprobado. Total: ${formatCurrency(currency, total)}.`,
      html: `<h2>Pago aprobado</h2><p>Tu pedido <strong>${orderNumber}</strong> fue aprobado.</p><p>Total: ${formatCurrency(currency, total)}</p>`,
    };
  }

  if (eventType === "ORDER_SHIPPED") {
    return {
      subject: `PrimeGearStore: pedido ${orderNumber} enviado`,
      text: `Tu pedido ${orderNumber} fue enviado.${carrier ? ` Transportadora: ${carrier}.` : ""}${trackingNumber ? ` Guia: ${trackingNumber}.` : ""}`,
      html: `<h2>Pedido enviado</h2><p>Tu pedido <strong>${orderNumber}</strong> fue enviado.</p>${carrier ? `<p>Transportadora: ${carrier}</p>` : ""}${trackingNumber ? `<p>Guia: ${trackingNumber}</p>` : ""}`,
    };
  }

  if (eventType === "CART_ABANDONED") {
    const recoveryLink = payload.recovery_link ? String(payload.recovery_link) : null;
    return {
      subject: `PrimeGearStore: retomemos tu carrito`,
      text: recoveryLink
        ? `Tu carrito sigue disponible. Recuperalo aqui: ${recoveryLink}`
        : "Tu carrito sigue disponible en PrimeGearStore.",
      html: recoveryLink
        ? `<h2>Tu carrito sigue disponible</h2><p><a href="${recoveryLink}">Recuperar carrito</a></p>`
        : "<h2>Tu carrito sigue disponible en PrimeGearStore.</h2>",
    };
  }

  return {
    subject: `PrimeGearStore: pedido ${orderNumber} entregado`,
    text: `Tu pedido ${orderNumber} fue marcado como entregado.`,
    html: `<h2>Pedido entregado</h2><p>Tu pedido <strong>${orderNumber}</strong> fue marcado como entregado.</p>`,
  };
}

export async function enqueueCartNotificationEventInTransaction(params: {
  tx: Prisma.TransactionClient;
  cartId: string;
  eventType: "CART_ABANDONED";
  toAddress: string;
  payload?: Record<string, unknown>;
}) {
  return enqueueCartNotificationOutbox(
    {
      eventType: params.eventType,
      cartId: params.cartId,
      channel: "EMAIL",
      toAddress: params.toAddress,
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
    },
    params.tx,
  );
}

export async function enqueueOrderNotificationEventInTransaction(params: {
  tx: Prisma.TransactionClient;
  orderId: bigint;
  eventType: NotificationEventType;
  payload?: Record<string, unknown>;
}) {
  const context = await findOrderNotificationContext(params.orderId, params.tx);
  if (!context) {
    throw new AppError("NOT_FOUND", 404, "Order not found for notification.");
  }

  const payload: Record<string, unknown> = {
    orderId: context.order_id.toString(),
    orderNumber: context.order_number,
    orderStatus: context.order_status,
    total: context.order_total.toString(),
    currency: context.currency,
    ...params.payload,
  };

  return enqueueOrderNotificationOutbox(
    {
      eventType: params.eventType,
      orderId: params.orderId,
      channel: "EMAIL",
      toAddress: context.customer_email ?? buildRecipientFallback(context.order_number),
      payload: payload as Prisma.InputJsonValue,
    },
    params.tx,
  );
}

export async function enqueueOrderNotificationEvent(params: {
  orderId: bigint;
  eventType: NotificationEventType;
  payload?: Record<string, unknown>;
}) {
  const context = await findOrderNotificationContext(params.orderId);
  if (!context) {
    throw new AppError("NOT_FOUND", 404, "Order not found for notification.");
  }

  return enqueueOrderNotificationOutbox(
    {
      eventType: params.eventType,
      orderId: params.orderId,
      channel: "EMAIL",
      toAddress: context.customer_email ?? buildRecipientFallback(context.order_number),
      payload: {
        orderId: context.order_id.toString(),
        orderNumber: context.order_number,
        orderStatus: context.order_status,
        total: context.order_total.toString(),
        currency: context.currency,
        ...params.payload,
      } as Prisma.InputJsonValue,
    },
    prisma,
  );
}

export async function processNotificationOutbox(limit: number): Promise<ProcessOutboxResultDto> {
  const provider = getEmailProvider();
  const from = getEmailFrom();
  const rows = await listPendingOutbox(limit);

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const eventType = row.eventType as NotificationEventType;
      const { subject, text, html } = buildEmailContent(eventType, payload);
      await provider.send({
        to: row.toAddress,
        from,
        subject,
        text,
        html,
      });
      await markOutboxSent(row.id);
      sent += 1;
    } catch (error) {
      const lastError = error instanceof Error ? error.message : "Unknown email provider error.";
      await markOutboxFailed(row.id, lastError.slice(0, 1000));
      failed += 1;
    }
  }

  return {
    processed: rows.length,
    sent,
    failed,
    remainingPending: await countPendingOutbox(),
  };
}
