import { AppError } from "@/lib/errors/app-error";
import { cancelOrderByAdmin, updateFulfillmentStatus } from "@/modules/fulfillment/fulfillment.service";
import { reconcileMercadoPagoOrderPayment } from "@/modules/webstore/mercadopago.service";
import type {
  AdminOrdersListQueryDto,
  ReconcilePaymentInputDto,
  UpdateOrderStatusInputDto,
} from "@/modules/admin-orders/admin-orders.dto";
import { getOrderDetail, getSaleByOrderId, listOrders } from "@/modules/admin-orders/admin-orders.repo";

export async function listAdminOrders(query: AdminOrdersListQueryDto) {
  const rows = await listOrders(query);
  return {
    items: rows.map((row) => ({
      orderNumber: row.order_number,
      status: row.status,
      total: row.total.toString(),
      createdAt: row.created_at.toISOString(),
      paymentStatus: row.payment_status,
      saleId: row.sale_id ? row.sale_id.toString() : null,
      converted: row.converted,
    })),
    pagination: {
      limit: query.limit,
      offset: query.offset,
      count: rows.length,
    },
  };
}

export async function getAdminOrderDetail(orderNumber: string) {
  const order = await getOrderDetail(orderNumber);
  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  const sale = await getSaleByOrderId(order.id);

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total.toString(),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId,
      quantity: item.quantity.toString(),
      unitPriceSnapshot: item.unitPriceSnapshot.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
    reservations: order.stockReservations.map((reservation) => ({
      id: reservation.id.toString(),
      productId: reservation.productId,
      status: reservation.status,
      quantity: reservation.quantity.toString(),
      expiresAt: reservation.expiresAt.toISOString(),
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id.toString(),
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: payment.status,
      amount: payment.amount.toString(),
      createdAt: payment.createdAt.toISOString(),
    })),
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id.toString(),
      status: shipment.status,
      carrier: shipment.carrier,
      service: shipment.service,
      trackingNumber: shipment.trackingNumber,
      shippedAt: shipment.shippedAt?.toISOString() ?? null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
      createdAt: shipment.createdAt.toISOString(),
    })),
    sale: sale
      ? {
          saleId: sale.id.toString(),
          status: sale.status,
          total: sale.total.toString(),
        }
      : null,
  };
}

export async function reconcileAdminOrderPayment(input: ReconcilePaymentInputDto) {
  return reconcileMercadoPagoOrderPayment({
    orderNumber: input.orderNumber,
    force: input.force,
  });
}

export async function cancelAdminOrder(orderNumber: string) {
  return cancelOrderByAdmin(orderNumber);
}

export async function updateAdminOrderStatus(input: UpdateOrderStatusInputDto) {
  return updateFulfillmentStatus({
    orderNumber: input.orderNumber,
    status: input.status,
    adminUserId: input.adminUserId,
  });
}
