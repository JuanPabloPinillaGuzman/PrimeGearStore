export const APP_ROLES = ["ADMIN", "STAFF", "CUSTOMER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ADMIN_ROLES: AppRole[] = ["ADMIN", "STAFF"];
