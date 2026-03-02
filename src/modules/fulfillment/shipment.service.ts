import { ShipmentStatus } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import type { CreateShipmentInputDto, UpdateShipmentInputDto } from "@/modules/fulfillment/dto";
import {
  findOrderWithShipments,
  updateShipmentForOrder,
  upsertShipmentForOrder,
} from "@/modules/fulfillment/repo";

export async function createShipmentForOrder(input: CreateShipmentInputDto) {
  const order = await findOrderWithShipments(input.orderNumber);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  const shipment = await upsertShipmentForOrder(order.id, {
    carrier: input.carrier,
    service: input.service,
    trackingNumber: input.trackingNumber,
  });

  return {
    id: shipment.id.toString(),
    orderNumber: order.orderNumber,
    carrier: shipment.carrier,
    service: shipment.service,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    shippedAt: shipment.shippedAt?.toISOString() ?? null,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
  };
}

export async function updateShipmentForOrderService(input: UpdateShipmentInputDto) {
  const order = await findOrderWithShipments(input.orderNumber);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  if (input.status === "DELIVERED" && order.status !== "SHIPPED") {
    throw new AppError("CONFLICT", 409, "Cannot set shipment DELIVERED when order is not SHIPPED.");
  }

  if ((input.status === "SHIPPED" || input.status === "IN_TRANSIT") && !input.trackingNumber) {
    const existing = order.shipments[0];
    if (!existing?.trackingNumber) {
      throw new AppError("UNPROCESSABLE", 422, "Tracking number is required.");
    }
  }

  const shipment = await updateShipmentForOrder(
    order.id,
    {
      carrier: input.carrier,
      service: input.service,
      trackingNumber: input.trackingNumber,
      status: input.status as ShipmentStatus | undefined,
    },
  );

  if (!shipment) {
    throw new AppError("NOT_FOUND", 404, "Shipment not found for order.");
  }

  return {
    id: shipment.id.toString(),
    orderNumber: order.orderNumber,
    carrier: shipment.carrier,
    service: shipment.service,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    shippedAt: shipment.shippedAt?.toISOString() ?? null,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
  };
}
