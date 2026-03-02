import { describe, expect, it } from "vitest";
import { parseCatalogFiltersFromSearchParams } from "@/lib/store/catalog-filters";

describe("parseCatalogFiltersFromSearchParams", () => {
  it("parses supported filters and defaults", () => {
    const params = new URLSearchParams(
      "search=gear&categoryId=2&minPrice=1000&maxPrice=9999&inStock=1&sort=PRICE_ASC&page=3",
    );
    expect(parseCatalogFiltersFromSearchParams(params)).toEqual({
      search: "gear",
      categoryId: "2",
      minPrice: "1000",
      maxPrice: "9999",
      inStock: true,
      sort: "PRICE_ASC",
      page: 3,
    });
  });

  it("uses safe defaults for invalid page", () => {
    const params = new URLSearchParams("page=0");
    expect(parseCatalogFiltersFromSearchParams(params).page).toBe(1);
  });
});
