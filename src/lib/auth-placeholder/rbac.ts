export type Role = "STORE_CUSTOMER" | "ADMIN" | "MANAGER";

export type AuthContext = {
  userId: string | null;
  roles: Role[];
};

export function hasRole(auth: AuthContext, role: Role) {
  return auth.roles.includes(role);
}

// TODO: Wire this with real auth provider and session middleware.
export function getAuthContextPlaceholder(): AuthContext {
  return {
    userId: null,
    roles: [],
  };
}
