import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { PdpPanel } from "@/components/store/PdpPanel";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductGallery } from "@/components/store/ProductGallery";
import { getCatalogProductDetailBySlugWithStock, getStoreRecommendations } from "@/modules/catalog/catalog.service";
import { findProductSlugById } from "@/modules/catalog/catalog.repo";

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
      images:
        product.images.length > 0
          ? product.images.slice(0, 4).map((image) => ({
              url: image.url,
              alt: image.alt ?? product.name,
            }))
          : product.image?.url
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
    image:
      product.images.length > 0
        ? product.images.map((image) => image.url)
        : product.image?.url
          ? [product.image.url]
          : undefined,
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
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <Link className="rounded-md border px-3 py-2 text-sm" href="/store">
          Volver al catalogo
        </Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
        <ProductGallery
          images={
            product.images.length > 0
              ? product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }))
              : product.image
                ? [{ url: product.image.url, alt: product.image.alt ?? product.name }]
                : []
          }
          fallbackLabel="PRIMEGEARSTORE"
        />
        <PdpPanel product={product} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mt-10">
        <h2 className="mb-5 text-xl font-semibold">Te puede interesar</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin recomendaciones por ahora.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            {recommendations.slice(0, 8).map((item) => (
              <div key={item.id} className="w-64 shrink-0 sm:w-auto">
                <ProductCard
                  product={{
                    id: item.id,
                    sku: null,
                    slug: item.slug,
                    name: item.name,
                    category: null,
                    price: item.price,
                    image: item.image,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
