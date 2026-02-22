export type NotificationEventType =
  | "ORDER_CREATED"
  | "PAYMENT_APPROVED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "CART_ABANDONED";

export type NotificationChannel = "EMAIL";

export type OutboxStatus = "PENDING" | "SENT" | "FAILED";

export type ProcessOutboxResultDto = {
  processed: number;
  sent: number;
  failed: number;
  remainingPending?: number;
};
