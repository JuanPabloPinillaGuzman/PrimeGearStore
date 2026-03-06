import type { ElementType } from "react";
import {
  BarChart3,
  BoxesIcon,
  ClipboardList,
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  Truck,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ElementType;
  adminOnly?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/fulfillment", label: "Fulfillment", icon: Truck },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/featured", label: "Recomendados", icon: Star },
  { href: "/admin/variants", label: "Variantes", icon: BoxesIcon },
  { href: "/admin/stock", label: "Stock", icon: ClipboardList },
  { href: "/admin/coupons", label: "Cupones", icon: Tag },
  { href: "/admin/purchases", label: "Compras", icon: ShoppingBag, adminOnly: true },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3, adminOnly: true },
];
