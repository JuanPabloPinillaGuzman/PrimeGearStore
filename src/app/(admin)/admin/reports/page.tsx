"use client";

import { useState } from "react";

type DailyResponse = {
  data: Array<{
    day: string;
    salesCount: number;
    salesTotal: string;
  }>;
};

type TopProductsResponse = {
  data: Array<{
    productId: number;
    sku: string | null;
    name: string;
    quantity: string;
    total: string;
  }>;
};

type ProfitDailyResponse = {
  data: Array<{
    day: string;
    totalSales: string;
    totalCogs: string;
    grossProfit: string;
  }>;
};

type ProfitTopVariantsResponse = {
  data: Array<{
    variantId: string;
    productId: number;
    productName: string;
    variantName: string;
    variantSku: string | null;
    quantity: string;
    totalSales: string;
    totalCogs: string;
    grossProfit: string;
  }>;
};

export default function AdminReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [daily, setDaily] = useState<DailyResponse["data"]>([]);
  const [topProducts, setTopProducts] = useState<TopProductsResponse["data"]>([]);
  const [profitDaily, setProfitDaily] = useState<ProfitDailyResponse["data"]>([]);
  const [topVariantsProfit, setTopVariantsProfit] = useState<ProfitTopVariantsResponse["data"]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    setError(null);
    try {
      const dailyRes = await fetch(`/api/admin/reports/sales/daily?from=${from}&to=${to}`);
      const dailyPayload = (await dailyRes.json()) as DailyResponse | { error: { message: string } };
      if (!dailyRes.ok || !("data" in dailyPayload)) {
        throw new Error("No fue posible cargar reporte diario.");
      }
      setDaily(dailyPayload.data);

      const topRes = await fetch(`/api/admin/reports/top-products?from=${from}&to=${to}&limit=10`);
      const topPayload = (await topRes.json()) as
        | TopProductsResponse
        | { error: { message: string } };
      if (!topRes.ok || !("data" in topPayload)) {
        throw new Error("No fue posible cargar top productos.");
      }
      setTopProducts(topPayload.data);

      const profitDailyRes = await fetch(`/api/admin/reports/profit/daily?from=${from}&to=${to}`);
      const profitDailyPayload = (await profitDailyRes.json()) as
        | ProfitDailyResponse
        | { error: { message: string } };
      if (!profitDailyRes.ok || !("data" in profitDailyPayload)) {
        throw new Error("No fue posible cargar rentabilidad diaria.");
      }
      setProfitDaily(profitDailyPayload.data);

      const topVariantsRes = await fetch(
        `/api/admin/reports/profit/top-variants?from=${from}&to=${to}&limit=10`,
      );
      const topVariantsPayload = (await topVariantsRes.json()) as
        | ProfitTopVariantsResponse
        | { error: { message: string } };
      if (!topVariantsRes.ok || !("data" in topVariantsPayload)) {
        throw new Error("No fue posible cargar top utilidad por variante.");
      }
      setTopVariantsProfit(topVariantsPayload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar reportes.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Reportes</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          className="rounded-md border px-3 py-2"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={loadReports}>
          Cargar reportes
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Ventas por día</h2>
        {daily.map((item) => (
          <p key={item.day} className="text-sm">
            {item.day}: {item.salesCount} ventas | total {item.salesTotal}
          </p>
        ))}
        {daily.length === 0 && <p className="text-sm text-muted-foreground">Sin datos.</p>}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Top productos</h2>
        {topProducts.map((item) => (
          <p key={item.productId} className="text-sm">
            {item.name} ({item.sku ?? "N/A"}): qty {item.quantity} | total {item.total}
          </p>
        ))}
        {topProducts.length === 0 && <p className="text-sm text-muted-foreground">Sin datos.</p>}
      </section>

      <section className="mt-8 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Rentabilidad diaria (WAC)</h2>
        {profitDaily.map((item) => (
          <p key={item.day} className="text-sm">
            {item.day}: ventas {item.totalSales} | COGS {item.totalCogs} | utilidad {item.grossProfit}
          </p>
        ))}
        {profitDaily.length === 0 && <p className="text-sm text-muted-foreground">Sin datos.</p>}
      </section>

      <section className="mt-8 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Top variantes por utilidad</h2>
        {topVariantsProfit.map((item) => (
          <p key={item.variantId} className="text-sm">
            {item.productName} / {item.variantName} ({item.variantSku ?? "N/A"}): qty {item.quantity} |
            ventas {item.totalSales} | COGS {item.totalCogs} | utilidad {item.grossProfit}
          </p>
        ))}
        {topVariantsProfit.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        )}
      </section>
    </main>
  );
}
