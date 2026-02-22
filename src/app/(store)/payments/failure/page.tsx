import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentFailurePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const value = params.orderNumber;
  const orderNumber = Array.isArray(value) ? value[0] : value;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-3 text-3xl font-semibold">Pago rechazado</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Mercado Pago indicó un fallo. Puedes intentar de nuevo desde tu orden.
      </p>
      <Link
        className="rounded-md border px-4 py-2"
        href={orderNumber ? `/orders/${encodeURIComponent(orderNumber)}` : "/store"}
      >
        {orderNumber ? "Ir a la orden" : "Volver a la tienda"}
      </Link>
    </main>
  );
}
