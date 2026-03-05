import Link from "next/link";

import { AppError } from "@/lib/errors/app-error";
import { getOrderDetailsByNumber } from "@/modules/webstore/webstore.service";

import { PrintButton } from "./print-button";

type Params = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export default async function OrderReceiptPage({ params }: Params) {
  const { orderNumber } = await params;

  try {
    const order = await getOrderDetailsByNumber(orderNumber);

    return (
      <main className="mx-auto max-w-3xl px-6 py-10 print:px-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/orders/${orderNumber}`}>
            Volver al pedido
          </Link>
          <PrintButton />
        </div>

        <section className="space-y-4 rounded-lg border p-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Receipt / Recibo</h1>
            <p className="text-sm text-muted-foreground">Pedido {order.orderNumber}</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <p className="text-sm">
              Estado: <strong>{order.status}</strong>
            </p>
            <p className="text-sm">
              Moneda: <strong>{order.currency}</strong>
            </p>
            <p className="text-sm">
              Tracking: <strong>{order.shipment?.trackingNumber ?? "N/A"}</strong>
            </p>
            <p className="text-sm">
              Carrier: <strong>{order.shipment?.carrier ?? "N/A"}</strong>
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium">Items</h2>
            <div className="overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Product ID</th>
                    <th className="px-3 py-2 text-left">Cantidad</th>
                    <th className="px-3 py-2 text-left">Precio unitario</th>
                    <th className="px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.productId}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.unitPriceSnapshot}</td>
                      <td className="px-3 py-2">{item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-1 text-sm">
            <p>
              Subtotal: <strong>{order.currency} {order.totals.subtotal}</strong>
            </p>
            <p>
              Descuentos: <strong>{order.currency} {order.totals.discountTotal}</strong>
            </p>
            <p>
              Impuestos: <strong>{order.currency} {order.totals.taxTotal}</strong>
            </p>
            <p>
              Envio: <strong>{order.currency} {order.totals.shippingTotal}</strong>
            </p>
            <p>
              Total: <strong>{order.currency} {order.totals.total}</strong>
            </p>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "No fue posible generar el recibo.";
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-semibold">Recibo</h1>
        <p className="text-sm text-red-600">{message}</p>
      </main>
    );
  }
}

