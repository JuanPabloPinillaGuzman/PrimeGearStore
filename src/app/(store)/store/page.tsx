"use client";

import { useEffect, useState } from "react";

type CatalogItem = {
  id: number;
  sku: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
};

export default function StorePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const response = await fetch("/api/store/catalog");
        if (!response.ok) {
          throw new Error("Failed to load catalog.");
        }

        const payload = (await response.json()) as { data: CatalogItem[] };
        setItems(payload.data);
      } catch {
        setError("No fue posible cargar el catalogo.");
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Store Catalog</h1>
        <a className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/checkout">
          Ir a checkout
        </a>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Cargando catalogo...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border p-4">
              <h2 className="text-lg font-medium">{item.name}</h2>
              <p className="text-sm text-muted-foreground">
                SKU: {item.sku ?? "N/A"} | Categoria: {item.category?.name ?? "Sin categoria"}
              </p>
              <p className="mt-2 font-semibold">
                {item.price ? `${item.price.currency} ${item.price.amount}` : "Sin precio vigente"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Imagen principal: {item.image?.url ?? "No disponible"}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
