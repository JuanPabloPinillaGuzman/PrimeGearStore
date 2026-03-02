import { Prisma, ShipmentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findOrderWithShipments(orderNumber: string, db: DbClient = prisma) {
  return db.order.findUnique({
    where: { orderNumber },
    include: {
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function upsertShipmentForOrder(
  orderId: bigint,
  data: { carrier?: string; service?: string; trackingNumber: string },
  db: DbClient = prisma,
) {
  const existing = await db.shipment.findFirst({
    where: {
      orderId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return db.shipment.update({
      where: { id: existing.id },
      data: {
        carrier: data.carrier,
        service: data.service,
        trackingNumber: data.trackingNumber,
      },
    });
  }

  return db.shipment.create({
    data: {
      orderId,
      carrier: data.carrier,
      service: data.service,
      trackingNumber: data.trackingNumber,
      status: ShipmentStatus.PENDING,
    },
  });
}

export async function updateShipmentForOrder(
  orderId: bigint,
  data: {
    carrier?: string;
    service?: string;
    trackingNumber?: string;
    status?: ShipmentStatus;
  },
  db: DbClient = prisma,
) {
  const shipment = await db.shipment.findFirst({
    where: {
      orderId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!shipment) {
    return null;
  }

  return db.shipment.update({
    where: { id: shipment.id },
    data: {
      carrier: data.carrier ?? shipment.carrier,
      service: data.service ?? shipment.service,
      trackingNumber: data.trackingNumber ?? shipment.trackingNumber,
      status: data.status ?? shipment.status,
    },
  });
}

export async function updateOrderStatusForFulfillment(
  orderId: bigint,
  status: "PACKING" | "SHIPPED" | "DELIVERED",
  db: DbClient,
) {
  return db.order.update({
    where: { id: orderId },
    data: { status },
  });
}

export async function markShipmentShipped(orderId: bigint, db: DbClient) {
  const shipment = await db.shipment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  if (!shipment) return null;

  return db.shipment.update({
    where: { id: shipment.id },
    data: {
      status: ShipmentStatus.SHIPPED,
      shippedAt: shipment.shippedAt ?? new Date(),
    },
  });
}

export async function markShipmentDelivered(orderId: bigint, db: DbClient) {
  const shipment = await db.shipment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  if (!shipment) return null;

  return db.shipment.update({
    where: { id: shipment.id },
    data: {
      status: ShipmentStatus.DELIVERED,
      deliveredAt: shipment.deliveredAt ?? new Date(),
    },
  });
}

export async function cancelOrderForAdmin(orderId: bigint, db: DbClient) {
  return db.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });
}

export function withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(callback);
}
