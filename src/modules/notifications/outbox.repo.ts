import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  NotificationChannel,
  NotificationEventType,
  OutboxStatus,
} from "@/modules/notifications/dto";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findOrderNotificationContext(orderId: bigint, db: DbClient = prisma) {
  const rows = await db.$queryRaw<
    Array<{
      order_id: bigint;
      order_number: string;
      order_status: string;
      order_total: Prisma.Decimal;
      currency: string;
      customer_email: string | null;
    }>
  >(Prisma.sql`
    SELECT
      o.id AS order_id,
      o.order_number,
      o.status::text AS order_status,
      o.total AS order_total,
      o.currency,
      c.email::text AS customer_email
    FROM webstore.orders o
    LEFT JOIN inventory.customers c ON c.id = o.customer_id
    WHERE o.id = ${orderId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function enqueueOrderNotificationOutbox(
  params: {
    eventType: NotificationEventType;
    orderId: bigint;
    channel?: NotificationChannel;
    toAddress: string;
    payload: Prisma.InputJsonValue;
  },
  db: DbClient,
) {
  return db.notificationOutbox.upsert({
    where: {
      eventType_orderId_channel: {
        eventType: params.eventType,
        orderId: params.orderId,
        channel: params.channel ?? "EMAIL",
      },
    },
    update: {
      toAddress: params.toAddress,
      payload: params.payload,
      // Keep PENDING/SENT/FAILED as-is to preserve idempotence semantics.
    },
    create: {
      eventType: params.eventType,
      orderId: params.orderId,
      channel: params.channel ?? "EMAIL",
      toAddress: params.toAddress,
      payload: params.payload,
      status: "PENDING",
    },
  });
}

export async function enqueueCartNotificationOutbox(
  params: {
    eventType: NotificationEventType;
    cartId: string;
    channel?: NotificationChannel;
    toAddress: string;
    payload: Prisma.InputJsonValue;
  },
  db: DbClient,
) {
  const channel = params.channel ?? "EMAIL";
  const existing = await db.notificationOutbox.findFirst({
    where: {
      eventType: params.eventType,
      cartId: params.cartId,
      channel,
    },
    select: { id: true },
  });

  if (existing) {
    return db.notificationOutbox.update({
      where: { id: existing.id },
      data: {
        toAddress: params.toAddress,
        payload: params.payload,
      },
    });
  }

  return db.notificationOutbox.create({
    data: {
      eventType: params.eventType,
      cartId: params.cartId,
      channel,
      toAddress: params.toAddress,
      payload: params.payload,
      status: "PENDING",
    },
  });
}

export async function listPendingOutbox(limit: number, db: DbClient = prisma) {
  return db.notificationOutbox.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
  });
}

export async function markOutboxSent(id: bigint, db: DbClient = prisma) {
  return db.notificationOutbox.update({
    where: { id },
    data: {
      status: "SENT" satisfies OutboxStatus,
      attempts: { increment: 1 },
      lastError: null,
      sentAt: new Date(),
    },
  });
}

export async function markOutboxFailed(id: bigint, errorMessage: string, db: DbClient = prisma) {
  return db.notificationOutbox.update({
    where: { id },
    data: {
      status: "FAILED" satisfies OutboxStatus,
      attempts: { increment: 1 },
      lastError: errorMessage,
    },
  });
}

export async function countPendingOutbox(db: DbClient = prisma) {
  return db.notificationOutbox.count({
    where: {
      status: "PENDING",
    },
  });
}
