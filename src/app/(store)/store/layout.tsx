import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "PrimeGearStore | Catalogo",
    template: "%s | PrimeGearStore",
  },
  description: "Tienda online PrimeGearStore con catalogo, checkout y seguimiento de pedidos.",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
