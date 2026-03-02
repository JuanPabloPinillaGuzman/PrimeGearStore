import { permanentRedirect, notFound } from "next/navigation";

import { findProductSlugById } from "@/modules/catalog/repo";

type Params = {
  params: Promise<{
    productId: string;
  }>;
};

async function getLegacyRedirect(productIdParam: string) {
  const productId = Number(productIdParam);
  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }
  return findProductSlugById(productId);
}

export default async function ProductDetailPage({ params }: Params) {
  const { productId } = await params;
  const legacy = await getLegacyRedirect(productId);
  if (!legacy?.slug || !legacy.isActive) {
    notFound();
  }
  permanentRedirect(`/products/${legacy.slug}`);
}
