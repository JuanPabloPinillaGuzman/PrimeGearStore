import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import type {
  CreateCustomerAddressInputDto,
  CustomerAddressesOutputDto,
  MeDto,
  MeOrdersOutputDto,
  MeOrdersQueryDto,
  UpdateCustomerAddressInputDto,
} from "@/modules/account/account.dto";
import {
  clearDefaultAddressForCustomer,
  countOrdersByCustomer,
  createCustomerAddress,
  deleteCustomerAddress,
  findCustomerAddressById,
  findCustomerByEmail,
  listCustomerAddresses,
  listOrdersByCustomer,
  updateCustomerAddress,
} from "@/modules/account/account.repo";

function mapAddressRow(row: Awaited<ReturnType<typeof listCustomerAddresses>>[number]) {
  return {
    id: row.id.toString(),
    type: row.type,
    fullName: row.full_name,
    phone: row.phone,
    country: row.country,
    department: row.department,
    city: row.city,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    postalCode: row.postal_code,
    notes: row.notes,
    isDefault: row.is_default,
    createdAt: row.created_at.toISOString(),
  };
}

export async function resolveCustomerContext(sessionUser: { email?: string | null; name?: string | null; role?: string | null }): Promise<MeDto> {
  if (!sessionUser.email) {
    throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
  }

  const customer = await findCustomerByEmail(sessionUser.email);

  return {
    email: sessionUser.email,
    name: sessionUser.name ?? null,
    role: sessionUser.role ?? "CUSTOMER",
    customer: customer
      ? {
          id: customer.id,
          fullName: customer.full_name,
          email: customer.email,
        }
      : null,
  };
}

function ensureCustomerRole(me: MeDto) {
  if (me.role !== "CUSTOMER") {
    throw new AppError("FORBIDDEN", 403, "Customer account required.");
  }
}

function ensureLinkedCustomer(me: MeDto) {
  ensureCustomerRole(me);
  if (!me.customer) {
    throw new AppError("NOT_FOUND", 404, "Customer profile not found.");
  }
  return me.customer;
}

export async function getMe(sessionUser: { email?: string | null; name?: string | null; role?: string | null }) {
  return resolveCustomerContext(sessionUser);
}

export async function getMyOrders(
  sessionUser: { email?: string | null; name?: string | null; role?: string | null },
  query: MeOrdersQueryDto,
): Promise<MeOrdersOutputDto> {
  const me = await resolveCustomerContext(sessionUser);
  const customer = ensureLinkedCustomer(me);
  const [rows, count] = await Promise.all([
    listOrdersByCustomer(customer.id, query),
    countOrdersByCustomer(customer.id),
  ]);

  return {
    items: rows.map((row) => ({
      orderNumber: row.order_number,
      status: row.status,
      total: row.total.toString(),
      currency: row.currency,
      createdAt: row.created_at.toISOString(),
      paymentStatus: row.payment_status,
    })),
    pagination: {
      limit: query.limit,
      offset: query.offset,
      count,
    },
  };
}

export async function getMyAddresses(
  sessionUser: { email?: string | null; name?: string | null; role?: string | null },
): Promise<CustomerAddressesOutputDto> {
  const me = await resolveCustomerContext(sessionUser);
  const customer = ensureLinkedCustomer(me);
  const rows = await listCustomerAddresses(customer.id);
  return { items: rows.map(mapAddressRow) };
}

export async function createMyAddress(
  sessionUser: { email?: string | null; name?: string | null; role?: string | null },
  input: CreateCustomerAddressInputDto,
) {
  const me = await resolveCustomerContext(sessionUser);
  const customer = ensureLinkedCustomer(me);

  const row = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await clearDefaultAddressForCustomer(customer.id, input.type ?? "SHIPPING", tx);
    }
    return createCustomerAddress(customer.id, input, tx);
  });

  if (!row) throw new AppError("INTERNAL_ERROR", 500, "Address creation failed.");
  return mapAddressRow(row);
}

export async function updateMyAddress(
  sessionUser: { email?: string | null; name?: string | null; role?: string | null },
  addressId: number,
  input: UpdateCustomerAddressInputDto,
) {
  const me = await resolveCustomerContext(sessionUser);
  const customer = ensureLinkedCustomer(me);
  const existing = await findCustomerAddressById(customer.id, addressId);
  if (!existing) {
    throw new AppError("NOT_FOUND", 404, "Address not found.");
  }

  const nextType = (input.type ?? existing.type) as "SHIPPING" | "BILLING";

  const row = await prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await clearDefaultAddressForCustomer(customer.id, nextType, tx);
    }
    return updateCustomerAddress(customer.id, addressId, input, tx);
  });

  if (!row) throw new AppError("INTERNAL_ERROR", 500, "Address update failed.");
  return mapAddressRow(row);
}

export async function deleteMyAddressById(
  sessionUser: { email?: string | null; name?: string | null; role?: string | null },
  addressId: number,
) {
  const me = await resolveCustomerContext(sessionUser);
  const customer = ensureLinkedCustomer(me);
  const affected = await deleteCustomerAddress(customer.id, addressId);
  if (affected < 1) {
    throw new AppError("NOT_FOUND", 404, "Address not found.");
  }
  return { deleted: true };
}
