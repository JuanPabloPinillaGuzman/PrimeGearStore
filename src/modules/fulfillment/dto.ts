export type FulfillmentStatus = "PACKING" | "SHIPPED" | "DELIVERED";

export type UpdateFulfillmentStatusInputDto = {
  orderNumber: string;
  status: FulfillmentStatus;
  adminUserId?: string;
};

export type CreateShipmentInputDto = {
  orderNumber: string;
  carrier?: string;
  service?: string;
  trackingNumber: string;
};

export type UpdateShipmentInputDto = {
  orderNumber: string;
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  status?: "PENDING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED";
};
