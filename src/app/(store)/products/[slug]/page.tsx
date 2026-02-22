import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { getCatalogProductDetailBySlugWithStock, getStoreRecommendations } from "@/modules/catalog/service";
import { findProductSlugById } from "@/modules/catalog/repo";
import { VariantSelector } from "./variant-selector";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

async function loadProduct(slug: string) {
  try {
    return await getCatalogProductDetailBySlugWithStock(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (/^\d+$/.test(slug)) {
    return {
      title: "Redirigiendo producto",
    };
  }
  const product = await loadProduct(slug);
  if (!product) {
    return { title: "Producto no encontrado" };
  }

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const canonical = `${baseUrl}/products/${product.slug ?? product.id}`;
  const description = `${product.name}${product.category ? ` | Categoria: ${product.category.name}` : ""}${product.price ? ` | ${product.price.currency} ${product.price.amount}` : ""}`;

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      images: product.image?.url
        ? [{ url: product.image.url, alt: product.image.alt ?? product.name }]
        : undefined,
    },
  };
}

export default async function ProductBySlugPage({ params }: Params) {
  const { slug } = await params;
  if (/^\d+$/.test(slug)) {
    const legacy = await findProductSlugById(Number(slug));
    if (legacy?.slug && legacy.isActive) {
      permanentRedirect(`/products/${legacy.slug}`);
    }
    notFound();
  }
  const product = await loadProduct(slug);
  if (!product) notFound();
  const recommendations = await getStoreRecommendations(product.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku ?? undefined,
    image: product.image?.url ? [product.image.url] : undefined,
    category: product.category?.name ?? undefined,
    offers: product.price
      ? {
          "@type": "Offer",
          priceCurrency: product.price.currency,
          price: product.price.amount,
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4">
        <Link className="rounded-md border px-3 py-2 text-sm" href="/store">
          Volver al catalogo
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          {product.image?.url ? (
            <Image
              src={product.image.url}
              alt={product.image.alt ?? product.name}
              width={800}
              height={600}
              className="h-auto w-full rounded-md object-cover"
              priority
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        <section className="rounded-lg border p-4">
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">SKU: {product.sku ?? "N/A"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Slug: {product.slug ?? "N/A"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Categoria: {product.category?.name ?? "Sin categoria"}
          </p>
          <p className="mt-4 text-xl font-semibold">
            {product.price ? `${product.price.currency} ${product.price.amount}` : "Sin precio vigente"}
          </p>
          <div className="mt-4">
            <Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/checkout">
              Ir a checkout
            </Link>
          </div>
          <VariantSelector variants={product.variants} />
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mt-10 rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">Te puede interesar</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin recomendaciones por ahora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.slug ?? item.id}`}
                className="rounded-md border p-3 text-sm hover:bg-muted/40"
              >
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.price ? `${item.price.currency} ${item.price.amount}` : "Sin precio"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
