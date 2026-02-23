export type MeDto = {
  email: string;
  name: string | null;
  role: string;
  customer: {
    id: number;
    fullName: string;
    email: string | null;
  } | null;
};

export type MeOrdersQueryDto = {
  limit: number;
  offset: number;
};

export type MeOrdersOutputDto = {
  items: Array<{
    orderNumber: string;
    status: string;
    total: string;
    currency: string;
    createdAt: string;
    paymentStatus: string | null;
  }>;
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

export type CustomerAddressDto = {
  id: string;
  type: string;
  fullName: string;
  phone: string;
  country: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type CustomerAddressesOutputDto = {
  items: CustomerAddressDto[];
};

export type CreateCustomerAddressInputDto = {
  type?: "SHIPPING" | "BILLING";
  fullName: string;
  phone: string;
  country?: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
  notes?: string;
  isDefault?: boolean;
};

export type UpdateCustomerAddressInputDto = Partial<CreateCustomerAddressInputDto>;
