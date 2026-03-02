export type AdminNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/variants", label: "Variants" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/purchases", label: "Purchases" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/coupons", label: "Coupons" },
];
