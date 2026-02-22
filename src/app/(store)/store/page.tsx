"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type CatalogItem = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
};

type CatalogResponse = {
  data: {
    items: CatalogItem[];
    pagination: {
      limit: number;
      offset: number;
      count: number;
    };
  };
};

export default function StorePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const params = new URLSearchParams({ limit: "24", offset: "0" });
        if (search.trim()) params.set("search", search.trim());

        const response = await fetch(`/api/store/catalog?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load catalog.");
        }

        const payload = (await response.json()) as CatalogResponse;
        setItems(payload.data.items);
      } catch {
        setError("No fue posible cargar el catalogo.");
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    void loadCatalog();
  }, [search]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Store Catalog</h1>
        <a className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/checkout">
          Ir a checkout
        </a>
      </div>
      <div className="mb-4">
        <input
          className="w-full max-w-md rounded-md border px-3 py-2"
          placeholder="Buscar por nombre o SKU"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {loading && <p className="text-sm text-muted-foreground">Cargando catalogo...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border p-4">
              <div className="mb-2">
                {item.image?.url ? (
                  <Image
                    src={item.image.url}
                    alt={item.image.alt ?? item.name}
                    width={480}
                    height={320}
                    className="h-40 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    Sin imagen
                  </div>
                )}
              </div>
              <h2 className="text-lg font-medium">
                <Link className="hover:underline" href={item.slug ? `/products/${item.slug}` : `/store/products/${item.id}`}>
                  {item.name}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">
                SKU: {item.sku ?? "N/A"} | Categoria: {item.category?.name ?? "Sin categoria"}
              </p>
              <p className="mt-2 font-semibold">
                {item.price ? `${item.price.currency} ${item.price.amount}` : "Sin precio vigente"}
              </p>
              <div className="mt-3">
                <Link
                  className="rounded-md border px-3 py-2 text-sm"
                  href={item.slug ? `/products/${item.slug}` : `/store/products/${item.id}`}
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
