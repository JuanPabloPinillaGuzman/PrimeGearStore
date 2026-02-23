import { createHash } from "node:crypto";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getCatalogItems } from "@/modules/catalog/service";
import { catalogListQuerySchema } from "@/modules/catalog/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawQuery = parseOrThrow(catalogListQuerySchema, Object.fromEntries(url.searchParams.entries()));
    const expandTokens = (rawQuery.expand ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const data = await getCatalogItems({
      search: rawQuery.search,
      categoryId: rawQuery.categoryId,
      minPrice: rawQuery.minPrice,
      maxPrice: rawQuery.maxPrice,
      inStock:
        rawQuery.inStock === true ||
        rawQuery.inStock === "1" ||
        rawQuery.inStock === "true"
          ? true
          : rawQuery.inStock === false || rawQuery.inStock === "0" || rawQuery.inStock === "false"
            ? false
            : undefined,
      sort: rawQuery.sort,
      limit: rawQuery.limit,
      offset: rawQuery.offset,
      expandVariants: expandTokens.includes("variants"),
    });

    const body = {
      data: data.items,
      meta: {
        total: data.pagination.total,
        limit: data.pagination.limit,
        offset: data.pagination.offset,
      },
      pagination: data.pagination,
    };
    const serialized = JSON.stringify(body);
    const etag = `"${createHash("sha1").update(serialized).digest("hex")}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

    const response = jsonOk(body, 200, request);
    response.headers.set("ETag", etag);
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    return handleRouteError(error, request);
  }
}

