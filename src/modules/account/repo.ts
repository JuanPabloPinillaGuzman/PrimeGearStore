import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  CreateCustomerAddressInputDto,
  UpdateCustomerAddressInputDto,
} from "@/modules/account/dto";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function clientOf(tx?: TxClient) {
  return tx ?? prisma;
}

export async function findCustomerByEmail(email: string) {
  const rows = await prisma.$queryRaw<
    Array<{ id: number; full_name: string; email: string | null }>
  >(Prisma.sql`
    SELECT c.id, c.full_name, c.email::text AS email
    FROM inventory.customers c
    WHERE lower(c.email::text) = lower(${email})
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listOrdersByCustomer(customerId: number, params: { limit: number; offset: number }) {
  return prisma.$queryRaw<
    Array<{
      order_number: string;
      status: string;
      total: Prisma.Decimal;
      currency: string;
      created_at: Date;
      payment_status: string | null;
    }>
  >(Prisma.sql`
    SELECT
      o.order_number,
      o.status::text,
      o.total,
      o.currency,
      o.created_at,
      p.status::text AS payment_status
    FROM webstore.orders o
    LEFT JOIN LATERAL (
      SELECT op.status
      FROM webstore.order_payments op
      WHERE op.order_id = o.id
      ORDER BY op.created_at DESC
      LIMIT 1
    ) p ON TRUE
    WHERE o.customer_id = ${customerId}
    ORDER BY o.created_at DESC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);
}

export async function countOrdersByCustomer(customerId: number) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM webstore.orders
    WHERE customer_id = ${customerId}
  `);
  return Number(rows[0]?.count ?? 0);
}

export async function listCustomerAddresses(customerId: number) {
  return prisma.$queryRaw<
    Array<{
      id: bigint;
      type: string;
      full_name: string;
      phone: string;
      country: string;
      department: string;
      city: string;
      address_line1: string;
      address_line2: string | null;
      postal_code: string | null;
      notes: string | null;
      is_default: boolean;
      created_at: Date;
    }>
  >(Prisma.sql`
    SELECT
      a.id,
      a.type::text,
      a.full_name,
      a.phone,
      a.country,
      a.department,
      a.city,
      a.address_line1,
      a.address_line2,
      a.postal_code,
      a.notes,
      a.is_default,
      a.created_at
    FROM webstore.customer_addresses a
    WHERE a.customer_id = ${customerId}
    ORDER BY a.is_default DESC, a.created_at DESC, a.id DESC
  `);
}

export async function findCustomerAddressById(customerId: number, addressId: number) {
  const rows = await prisma.$queryRaw<Array<{ id: bigint; customer_id: bigint; type: string }>>(Prisma.sql`
    SELECT id, customer_id, type::text
    FROM webstore.customer_addresses
    WHERE id = ${BigInt(addressId)}
      AND customer_id = ${customerId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function clearDefaultAddressForCustomer(
  customerId: number,
  type: "SHIPPING" | "BILLING",
  tx?: TxClient,
) {
  return clientOf(tx).$executeRaw(Prisma.sql`
    UPDATE webstore.customer_addresses
    SET is_default = false
    WHERE customer_id = ${customerId}
      AND type::text = ${type}
      AND is_default = true
  `);
}

export async function createCustomerAddress(
  customerId: number,
  input: CreateCustomerAddressInputDto,
  tx?: TxClient,
) {
  const rows = await clientOf(tx).$queryRaw<
    Array<{
      id: bigint;
      type: string;
      full_name: string;
      phone: string;
      country: string;
      department: string;
      city: string;
      address_line1: string;
      address_line2: string | null;
      postal_code: string | null;
      notes: string | null;
      is_default: boolean;
      created_at: Date;
    }>
  >(Prisma.sql`
    INSERT INTO webstore.customer_addresses (
      customer_id, type, full_name, phone, country, department, city,
      address_line1, address_line2, postal_code, notes, is_default
    )
    VALUES (
      ${customerId},
      ${input.type ?? "SHIPPING"}::webstore.address_type,
      ${input.fullName},
      ${input.phone},
      ${input.country ?? "CO"},
      ${input.department},
      ${input.city},
      ${input.addressLine1},
      ${input.addressLine2 ?? null},
      ${input.postalCode ?? null},
      ${input.notes ?? null},
      ${input.isDefault ?? false}
    )
    RETURNING
      id,
      type::text,
      full_name,
      phone,
      country,
      department,
      city,
      address_line1,
      address_line2,
      postal_code,
      notes,
      is_default,
      created_at
  `);
  return rows[0] ?? null;
}

export async function updateCustomerAddress(
  customerId: number,
  addressId: number,
  input: UpdateCustomerAddressInputDto,
  tx?: TxClient,
) {
  const sets: Prisma.Sql[] = [];

  if (input.type !== undefined) sets.push(Prisma.sql`type = ${input.type}::webstore.address_type`);
  if (input.fullName !== undefined) sets.push(Prisma.sql`full_name = ${input.fullName}`);
  if (input.phone !== undefined) sets.push(Prisma.sql`phone = ${input.phone}`);
  if (input.country !== undefined) sets.push(Prisma.sql`country = ${input.country}`);
  if (input.department !== undefined) sets.push(Prisma.sql`department = ${input.department}`);
  if (input.city !== undefined) sets.push(Prisma.sql`city = ${input.city}`);
  if (input.addressLine1 !== undefined) sets.push(Prisma.sql`address_line1 = ${input.addressLine1}`);
  if (input.addressLine2 !== undefined) sets.push(Prisma.sql`address_line2 = ${input.addressLine2 || null}`);
  if (input.postalCode !== undefined) sets.push(Prisma.sql`postal_code = ${input.postalCode || null}`);
  if (input.notes !== undefined) sets.push(Prisma.sql`notes = ${input.notes || null}`);
  if (input.isDefault !== undefined) sets.push(Prisma.sql`is_default = ${input.isDefault}`);

  if (sets.length === 0) {
    return null;
  }

  const rows = await clientOf(tx).$queryRaw<
    Array<{
      id: bigint;
      type: string;
      full_name: string;
      phone: string;
      country: string;
      department: string;
      city: string;
      address_line1: string;
      address_line2: string | null;
      postal_code: string | null;
      notes: string | null;
      is_default: boolean;
      created_at: Date;
    }>
  >(Prisma.sql`
    UPDATE webstore.customer_addresses
    SET ${Prisma.join(sets, ", ")}
    WHERE id = ${BigInt(addressId)}
      AND customer_id = ${customerId}
    RETURNING
      id,
      type::text,
      full_name,
      phone,
      country,
      department,
      city,
      address_line1,
      address_line2,
      postal_code,
      notes,
      is_default,
      created_at
  `);
  return rows[0] ?? null;
}

export async function deleteCustomerAddress(customerId: number, addressId: number) {
  return prisma.$executeRaw(Prisma.sql`
    DELETE FROM webstore.customer_addresses
    WHERE id = ${BigInt(addressId)}
      AND customer_id = ${customerId}
  `);
}
