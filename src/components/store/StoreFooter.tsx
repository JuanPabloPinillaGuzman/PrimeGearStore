import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">PrimeGearStore</p>
          <p className="mt-2 text-sm text-muted-foreground">
            E-commerce + backoffice con foco en una experiencia de compra simple.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Soporte</p>
          <div className="mt-2 space-y-1 text-sm">
            <Link href="#" className="block hover:text-primary">Ayuda</Link>
            <Link href="#" className="block hover:text-primary">Contacto</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Políticas</p>
          <div className="mt-2 space-y-1 text-sm">
            <Link href="#" className="block hover:text-primary">Envíos</Link>
            <Link href="#" className="block hover:text-primary">Devoluciones</Link>
            <Link href="#" className="block hover:text-primary">Privacidad</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Redes</p>
          <div className="mt-2 space-y-1 text-sm">
            <Link href="#" className="block hover:text-primary">Instagram</Link>
            <Link href="#" className="block hover:text-primary">X / Twitter</Link>
            <Link href="#" className="block hover:text-primary">WhatsApp</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
