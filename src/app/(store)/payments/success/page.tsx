import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const value = params.orderNumber;
  const orderNumber = Array.isArray(value) ? value[0] : value;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-3 text-3xl font-semibold">Pago exitoso</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Recibimos tu redirección de Mercado Pago. La confirmación final ocurre por webhook.
      </p>
      <Link
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        href={orderNumber ? `/orders/${encodeURIComponent(orderNumber)}` : "/store"}
      >
        {orderNumber ? "Ver mi orden" : "Volver a la tienda"}
      </Link>
    </main>
  );
}
