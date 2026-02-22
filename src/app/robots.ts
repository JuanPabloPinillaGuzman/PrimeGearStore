import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/store", "/products/"],
        disallow: ["/admin", "/api/admin", "/api/store/payments/", "/api/store/checkout"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
