import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight auth config used by the Edge middleware.
 * Must NOT import bcryptjs, Prisma, or any Node.js-only module.
 * The full auth.ts extends this with the Credentials provider + authorize logic.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
