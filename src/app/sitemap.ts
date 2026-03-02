import type { MetadataRoute } from "next";

import { getCatalogSitemapProducts } from "@/modules/catalog/service";
import { logger } from "@/lib/logger";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
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
    {
      url: `${baseUrl}/robots.txt`,
      changeFrequency: "weekly",
      priority: 0.3,
    },
  ];

  try {
    const products = await getCatalogSitemapProducts();
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
  } catch (error) {
    logger.warn({
      msg: "Sitemap fallback enabled: failed to load product URLs.",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return urls;
}
