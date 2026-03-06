import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type StoreUser = {
  id: number;
  email: string;
  passwordHash: string;
  fullName: string;
  emailVerified: boolean;
  createdAt: Date;
};

type StoreUserRow = {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  email_verified: boolean;
  created_at: Date;
};

function mapRow(row: StoreUserRow): StoreUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
  };
}

export async function findStoreUserByEmail(email: string): Promise<StoreUser | null> {
  const rows = await prisma.$queryRaw<StoreUserRow[]>(Prisma.sql`
    SELECT id, email, password_hash, full_name, email_verified, created_at
    FROM webstore.store_users
    WHERE email = lower(${email})
    LIMIT 1
  `);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findStoreUserById(id: number): Promise<StoreUser | null> {
  const rows = await prisma.$queryRaw<StoreUserRow[]>(Prisma.sql`
    SELECT id, email, password_hash, full_name, email_verified, created_at
    FROM webstore.store_users
    WHERE id = ${id}
    LIMIT 1
  `);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createStoreUser(data: {
  email: string;
  passwordHash: string;
  fullName: string;
}): Promise<StoreUser> {
  const rows = await prisma.$queryRaw<StoreUserRow[]>(Prisma.sql`
    INSERT INTO webstore.store_users (email, password_hash, full_name, email_verified)
    VALUES (lower(${data.email}), ${data.passwordHash}, ${data.fullName}, false)
    RETURNING id, email, password_hash, full_name, email_verified, created_at
  `);
  if (!rows[0]) throw new Error("Failed to create store user");
  // Also ensure a matching customer row exists in inventory
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO inventory.customers (full_name, email)
    SELECT ${data.fullName}, lower(${data.email})
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory.customers WHERE lower(email::text) = lower(${data.email})
    )
  `);
  return mapRow(rows[0]);
}

export async function setEmailVerified(userId: number): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE webstore.store_users SET email_verified = true WHERE id = ${userId}
  `);
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE webstore.store_users SET password_hash = ${passwordHash} WHERE id = ${userId}
  `);
}

// ── Verification tokens ────────────────────────────────────────────────────

export async function createVerificationToken(
  userId: number,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO webstore.verification_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `);
}

export async function findValidVerificationToken(
  token: string,
): Promise<{ userId: number } | null> {
  const rows = await prisma.$queryRaw<Array<{ user_id: number }>>(Prisma.sql`
    SELECT user_id FROM webstore.verification_tokens
    WHERE token = ${token}
      AND used_at IS NULL
      AND expires_at > now()
    LIMIT 1
  `);
  return rows[0] ? { userId: rows[0].user_id } : null;
}

export async function markVerificationTokenUsed(token: string): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE webstore.verification_tokens SET used_at = now() WHERE token = ${token}
  `);
}

/** Returns the most recent unused token for rate-limiting resend requests. */
export async function getRecentVerificationToken(
  userId: number,
  since: Date,
): Promise<{ createdAt: Date } | null> {
  const rows = await prisma.$queryRaw<Array<{ created_at: Date }>>(Prisma.sql`
    SELECT created_at FROM webstore.verification_tokens
    WHERE user_id = ${userId}
      AND used_at IS NULL
      AND created_at > ${since}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return rows[0] ? { createdAt: rows[0].created_at } : null;
}

// ── Password reset tokens ──────────────────────────────────────────────────

export async function createPasswordResetToken(
  userId: number,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO webstore.password_reset_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `);
}

export async function findValidPasswordResetToken(
  token: string,
): Promise<{ userId: number } | null> {
  const rows = await prisma.$queryRaw<Array<{ user_id: number }>>(Prisma.sql`
    SELECT user_id FROM webstore.password_reset_tokens
    WHERE token = ${token}
      AND used_at IS NULL
      AND expires_at > now()
    LIMIT 1
  `);
  return rows[0] ? { userId: rows[0].user_id } : null;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE webstore.password_reset_tokens SET used_at = now() WHERE token = ${token}
  `);
}

/** Returns most recent unused reset token for rate-limiting. */
export async function getRecentPasswordResetToken(
  userId: number,
  since: Date,
): Promise<{ createdAt: Date } | null> {
  const rows = await prisma.$queryRaw<Array<{ created_at: Date }>>(Prisma.sql`
    SELECT created_at FROM webstore.password_reset_tokens
    WHERE user_id = ${userId}
      AND used_at IS NULL
      AND created_at > ${since}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return rows[0] ? { createdAt: rows[0].created_at } : null;
}
