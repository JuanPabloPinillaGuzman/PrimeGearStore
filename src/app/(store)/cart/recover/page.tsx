import Link from "next/link";
import { redirect } from "next/navigation";

import { getRecoverCartByToken } from "@/modules/webstore/service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecoverCartPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  if (!token) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Recuperar carrito</h1>
        <p className="mt-3 text-sm text-muted-foreground">Token de recuperacion no encontrado.</p>
        <Link href="/store" className="mt-4 inline-block rounded-md border px-4 py-2 text-sm">
          Volver al catalogo
        </Link>
      </main>
    );
  }

  try {
    const cart = await getRecoverCartByToken(token);
    redirect(`/checkout?cartId=${encodeURIComponent(cart.cartId)}`);
  } catch {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Recuperar carrito</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El enlace de recuperacion es invalido o expirado.
        </p>
        <Link href="/store" className="mt-4 inline-block rounded-md border px-4 py-2 text-sm">
          Ir al catalogo
        </Link>
      </main>
    );
  }
}
