import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PromoStrip() {
  return (
    <section
      id="promociones"
      className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Promoción</Badge>
            <span className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Checkout</span>
          </div>
          <p className="mt-2 text-lg font-semibold tracking-tight">Usa <span className="text-primary">WELCOME10</span> en tu compra</p>
          <p className="text-sm text-muted-foreground">
            Cupón de bienvenida para probar el flujo completo de checkout y pago.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="rounded-full">
            <Link href="/checkout">Ir a checkout</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/store?search=">Explorar productos</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
