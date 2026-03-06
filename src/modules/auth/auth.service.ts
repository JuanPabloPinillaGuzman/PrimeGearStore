import { randomBytes } from "crypto";

import { hash } from "bcryptjs";

import { AppError } from "@/lib/errors/app-error";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import {
  createPasswordResetToken,
  createStoreUser,
  createVerificationToken,
  findStoreUserByEmail,
  findValidPasswordResetToken,
  findValidVerificationToken,
  getRecentPasswordResetToken,
  getRecentVerificationToken,
  markPasswordResetTokenUsed,
  markVerificationTokenUsed,
  setEmailVerified,
  updateUserPassword,
} from "@/modules/auth/auth.repo";

function generateToken(): string {
  return randomBytes(48).toString("hex");
}

/** 60 seconds minimum between resend/reset requests */
const RATE_LIMIT_MS = 60 * 1000;

export async function registerStoreUser(
  email: string,
  password: string,
  fullName: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await findStoreUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError("CONFLICT", 409, "Este correo ya tiene una cuenta registrada.");
  }

  const passwordHash = await hash(password, 12);
  const user = await createStoreUser({ email: normalizedEmail, passwordHash, fullName: fullName.trim() });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await createVerificationToken(user.id, token, expiresAt);
  await sendVerificationEmail(normalizedEmail, token);
}

export async function verifyEmailToken(token: string): Promise<void> {
  const found = await findValidVerificationToken(token);
  if (!found) {
    throw new AppError("BAD_REQUEST", 400, "El enlace de verificación es inválido o ya expiró.");
  }
  await markVerificationTokenUsed(token);
  await setEmailVerified(found.userId);
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findStoreUserByEmail(normalizedEmail);

  // Always return success to avoid leaking whether the email exists
  if (!user || user.emailVerified) return;

  const since = new Date(Date.now() - RATE_LIMIT_MS);
  const recent = await getRecentVerificationToken(user.id, since);
  if (recent) {
    throw new AppError(
      "UNPROCESSABLE",
      429,
      "Ya se envió un correo recientemente. Espera un momento antes de intentar de nuevo.",
    );
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await createVerificationToken(user.id, token, expiresAt);
  await sendVerificationEmail(normalizedEmail, token);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findStoreUserByEmail(normalizedEmail);

  // Always return success to avoid leaking whether the email exists
  if (!user) return;

  const since = new Date(Date.now() - RATE_LIMIT_MS);
  const recent = await getRecentPasswordResetToken(user.id, since);
  if (recent) {
    // Silently skip — don't reveal this to the caller, just skip sending
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await createPasswordResetToken(user.id, token, expiresAt);
  await sendPasswordResetEmail(normalizedEmail, token);
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<void> {
  const found = await findValidPasswordResetToken(token);
  if (!found) {
    throw new AppError("BAD_REQUEST", 400, "El enlace es inválido o ya expiró.");
  }
  const passwordHash = await hash(newPassword, 12);
  await updateUserPassword(found.userId, passwordHash);
  await markPasswordResetTokenUsed(token);
}

/** Used by auth.ts authorize to validate a store customer login. */
export async function authenticateStoreUser(
  email: string,
  password: string,
): Promise<{ id: number; email: string; fullName: string } | null> {
  const { compare } = await import("bcryptjs");
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findStoreUserByEmail(normalizedEmail);
  if (!user || !user.emailVerified) return null;
  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, email: user.email, fullName: user.fullName };
}
