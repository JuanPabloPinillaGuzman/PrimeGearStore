import { OrderStatus } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { enqueueOrderNotificationEventInTransaction } from "@/modules/notifications/outbox.service";
import type { UpdateFulfillmentStatusInputDto } from "@/modules/fulfillment/fulfillment.dto";
import {
  cancelOrderForAdmin,
  findOrderWithShipments,
  markShipmentDelivered,
  markShipmentShipped,
  updateOrderStatusForFulfillment,
  withTransaction,
} from "@/modules/fulfillment/fulfillment.repo";

function ensureShipmentTracking(order: NonNullable<Awaited<ReturnType<typeof findOrderWithShipments>>>) {
  const shipment = order.shipments[0];
  if (!shipment || !shipment.trackingNumber) {
    throw new AppError("UNPROCESSABLE", 422, "Shipment with tracking number is required.");
  }
}

export async function updateFulfillmentStatus(input: UpdateFulfillmentStatusInputDto) {
  return withTransaction(async (tx) => {
    const order = await findOrderWithShipments(input.orderNumber, tx);
    if (!order) {
      throw new AppError("NOT_FOUND", 404, "Order not found.");
    }

    const fromStatus = order.status;

    if (input.status === "PACKING") {
      if (order.status !== OrderStatus.PAID) {
        throw new AppError("CONFLICT", 409, "Only PAID orders can move to PACKING.");
      }
      const updated = await updateOrderStatusForFulfillment(order.id, "PACKING", tx);
      logger.info(
        {
          orderNumber: order.orderNumber,
          fromStatus,
          toStatus: updated.status,
          adminUserId: input.adminUserId ?? null,
        },
        "Fulfillment status updated.",
      );
      return {
        orderNumber: updated.orderNumber,
        status: updated.status,
      };
    }

    if (input.status === "SHIPPED") {
      if (order.status !== OrderStatus.PACKING) {
        throw new AppError("CONFLICT", 409, "Only PACKING orders can move to SHIPPED.");
      }
      ensureShipmentTracking(order);
      const shipment = await markShipmentShipped(order.id, tx);
      const updated = await updateOrderStatusForFulfillment(order.id, "SHIPPED", tx);
      await enqueueOrderNotificationEventInTransaction({
        tx,
        orderId: order.id,
        eventType: "ORDER_SHIPPED",
        payload: {
          trackingNumber: shipment?.trackingNumber ?? order.shipments[0]?.trackingNumber ?? null,
          carrier: shipment?.carrier ?? order.shipments[0]?.carrier ?? null,
          service: shipment?.service ?? order.shipments[0]?.service ?? null,
        },
      });
      logger.info(
        {
          orderNumber: order.orderNumber,
          fromStatus,
          toStatus: updated.status,
          adminUserId: input.adminUserId ?? null,
        },
        "Fulfillment status updated.",
      );
      return {
        orderNumber: updated.orderNumber,
        status: updated.status,
      };
    }

    if (order.status !== OrderStatus.SHIPPED) {
      throw new AppError("CONFLICT", 409, "Only SHIPPED orders can move to DELIVERED.");
    }
    const shipment = await markShipmentDelivered(order.id, tx);
    const updated = await updateOrderStatusForFulfillment(order.id, "DELIVERED", tx);
    await enqueueOrderNotificationEventInTransaction({
      tx,
      orderId: order.id,
      eventType: "ORDER_DELIVERED",
      payload: {
        trackingNumber: shipment?.trackingNumber ?? order.shipments[0]?.trackingNumber ?? null,
        carrier: shipment?.carrier ?? order.shipments[0]?.carrier ?? null,
        service: shipment?.service ?? order.shipments[0]?.service ?? null,
      },
    });
    logger.info(
      {
        orderNumber: order.orderNumber,
        fromStatus,
        toStatus: updated.status,
        adminUserId: input.adminUserId ?? null,
      },
      "Fulfillment status updated.",
    );
    return {
      orderNumber: updated.orderNumber,
      status: updated.status,
    };
  });
}

export async function cancelOrderByAdmin(orderNumber: string) {
  return withTransaction(async (tx) => {
    const order = await findOrderWithShipments(orderNumber, tx);
    if (!order) {
      throw new AppError("NOT_FOUND", 404, "Order not found.");
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new AppError("CONFLICT", 409, "Cannot cancel order at SHIPPED or DELIVERED status.");
    }

    const updated = await cancelOrderForAdmin(order.id, tx);
    return {
      orderNumber: updated.orderNumber,
      status: updated.status,
    };
  });
}
