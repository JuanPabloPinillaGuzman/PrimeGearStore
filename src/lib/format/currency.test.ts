import { describe, expect, it } from "vitest";
import { formatCOP } from "@/lib/format/currency";

describe("formatCOP", () => {
  it("formats numeric values as COP", () => {
    expect(formatCOP(125000, "COP")).toContain("125");
    expect(formatCOP(125000, "COP")).toContain("$");
  });

  it("falls back when amount is not numeric", () => {
    expect(formatCOP("abc", "COP")).toBe("COP abc");
  });
});
