import type { MetadataRoute } from "next";

import { getCatalogSitemapProducts } from "@/modules/catalog/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const products = await getCatalogSitemapProducts();

  const urls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/store`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  for (const product of products) {
    if (!product.slug) {
      continue;
    }
    urls.push({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.createdAt,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return urls;
}
