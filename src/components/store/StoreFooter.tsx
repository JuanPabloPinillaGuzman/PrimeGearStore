import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";

const FOOTER_LINKS = {
  tienda: [
    { label: "Catálogo", href: "/store" },
    { label: "Ofertas", href: "/store?sort=PRICE_ASC" },
    { label: "Novedades", href: "/store?sort=NEWEST" },
    { label: "Wishlist", href: "/wishlist" },
  ],
  cuenta: [
    { label: "Mi cuenta", href: "/account" },
    { label: "Mis pedidos", href: "/account/orders" },
    { label: "Mis direcciones", href: "/account/addresses" },
    { label: "Iniciar sesión", href: "/api/auth/signin?callbackUrl=/account" },
  ],
  soporte: [
    { label: "Carrito", href: "/cart" },
    { label: "Checkout", href: "/checkout" },
    { label: "Seguimiento de envío", href: "/account/orders#tracking" },
    { label: "Devoluciones", href: "/account/orders#devoluciones" },
  ],
};

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/30 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <BrandMark className="mb-4" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tienda de equipamiento premium. Encuentra los mejores productos con la mejor experiencia
              de compra.
            </p>
          </div>

          {/* Tienda */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tienda
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.tienda.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cuenta */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cuenta
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.cuenta.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Soporte
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.soporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/50 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {year} PrimeGearStore. Todos los derechos reservados.
          </p>
          <nav className="flex gap-4" aria-label="Links legales">
            <Link
              href="/store"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacidad
            </Link>
            <Link
              href="/store"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Términos
            </Link>
            <Link
              href="/store"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Cookies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
