import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { loadCredentialUsers } from "@/lib/auth/credentials-users";
import { authenticateStoreUser } from "@/modules/auth/auth.service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        // 1. Check env-var credential users (admin / staff)
        const users = loadCredentialUsers();
        const envUser = users.find((entry) => entry.email === parsed.data.email.toLowerCase());
        if (envUser) {
          const isValid = await compare(parsed.data.password, envUser.passwordHash);
          if (!isValid) return null;
          return {
            id: envUser.id,
            email: envUser.email,
            name: envUser.name,
            role: envUser.role,
          };
        }

        // 2. Check store customers in DB (only verified emails)
        const storeUser = await authenticateStoreUser(parsed.data.email, parsed.data.password);
        if (!storeUser) return null;

        return {
          id: String(storeUser.id),
          email: storeUser.email,
          name: storeUser.fullName,
          role: "CUSTOMER",
        };
      },
    }),
  ],
});
