import { APP_ROLES, type AppRole } from "@/lib/auth/roles";

type CredentialUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  name: string;
};

type RawUser = {
  email: string;
  passwordHash: string;
  role: string;
  name?: string;
};

function parseRole(role: string): AppRole | null {
  const normalized = role.toUpperCase();
  return APP_ROLES.includes(normalized as AppRole) ? (normalized as AppRole) : null;
}

function buildFromJson(): CredentialUser[] {
  const json = process.env.AUTH_USERS_JSON;
  if (!json) {
    return [];
  }

  try {
    const parsed = JSON.parse(json) as RawUser[];
    return parsed
      .map((user): CredentialUser | null => {
        const role = parseRole(user.role);
        if (!role || !user.email || !user.passwordHash) {
          return null;
        }

        return {
          id: user.email.toLowerCase(),
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash,
          role,
          name: user.name ?? user.email,
        };
      })
      .filter((user): user is CredentialUser => !!user);
  } catch {
    return [];
  }
}

function buildFromDedicatedEnv(): CredentialUser[] {
  const definitions: Array<{ role: AppRole; email?: string; passwordHash?: string }> = [
    {
      role: "ADMIN",
      email: process.env.AUTH_ADMIN_EMAIL,
      passwordHash: process.env.AUTH_ADMIN_PASSWORD_HASH,
    },
    {
      role: "STAFF",
      email: process.env.AUTH_STAFF_EMAIL,
      passwordHash: process.env.AUTH_STAFF_PASSWORD_HASH,
    },
    {
      role: "CUSTOMER",
      email: process.env.AUTH_CUSTOMER_EMAIL,
      passwordHash: process.env.AUTH_CUSTOMER_PASSWORD_HASH,
    },
  ];

  return definitions
    .filter((entry) => entry.email && entry.passwordHash)
    .map((entry) => ({
      id: entry.email!.toLowerCase(),
      email: entry.email!.toLowerCase(),
      passwordHash: entry.passwordHash!,
      role: entry.role,
      name: entry.email!,
    }));
}

export function loadCredentialUsers(): CredentialUser[] {
  const fromJson = buildFromJson();
  if (fromJson.length > 0) {
    return fromJson;
  }

  return buildFromDedicatedEnv();
}
