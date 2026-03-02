import { describe, expect, it } from "vitest";
import { mergeWishlistProductIds } from "@/lib/store/wishlist-utils";

describe("mergeWishlistProductIds", () => {
  it("deduplicates and preserves valid positive integers", () => {
    expect(mergeWishlistProductIds([1, 2, 2, 3], [3, 4])).toEqual([3, 4, 1, 2]);
  });

  it("filters invalid values", () => {
    expect(mergeWishlistProductIds([0, -1, 2], [1])).toEqual([1, 2]);
  });
});
