"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CategoryOption = {
  id: number;
  name: string;
  activeProductsCount: number;
};

type FilterState = {
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
};

type Props = {
  categories: CategoryOption[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  className?: string;
};

function FilterLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
    >
      {children}
    </label>
  );
}

export function FiltersPanel({ categories, value, onChange, onReset, className }: Props) {
  const hasActive =
    !!value.categoryId || !!value.minPrice || !!value.maxPrice || !!value.inStock;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold">Filtros</p>
        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <RotateCcw className="size-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-border/50" />

      {/* Category */}
      <div className="space-y-2">
        <FilterLabel htmlFor="categoryId">Categoría</FilterLabel>
        <Select
          id="categoryId"
          value={value.categoryId ?? ""}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value || undefined })}
          className="rounded-xl"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={String(cat.id)}>
              {cat.name} ({cat.activeProductsCount})
            </option>
          ))}
        </Select>
      </div>

      {/* Price range */}
      <div className="space-y-2">
        <FilterLabel htmlFor="minPrice">Rango de precio</FilterLabel>
        <div className="grid grid-cols-2 gap-2">
          <Input
            id="minPrice"
            inputMode="numeric"
            placeholder="Mín"
            value={value.minPrice ?? ""}
            onChange={(e) => onChange({ ...value, minPrice: e.target.value || undefined })}
            className="rounded-xl"
          />
          <Input
            id="maxPrice"
            inputMode="numeric"
            placeholder="Máx"
            value={value.maxPrice ?? ""}
            onChange={(e) => onChange({ ...value, maxPrice: e.target.value || undefined })}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <FilterLabel htmlFor="sort">Ordenar por</FilterLabel>
        <Select
          id="sort"
          value={value.sort ?? "RELEVANCE"}
          onChange={(e) => onChange({ ...value, sort: e.target.value || undefined })}
          className="rounded-xl"
        >
          <option value="RELEVANCE">Relevancia</option>
          <option value="NEWEST">Más nuevos</option>
          <option value="PRICE_ASC">Precio: menor a mayor</option>
          <option value="PRICE_DESC">Precio: mayor a menor</option>
          <option value="TOP_SELLERS">Más vendidos</option>
        </Select>
      </div>

      {/* In stock toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3.5 py-2.5 transition-colors hover:bg-muted/50">
        <span className="text-sm font-medium">Solo con stock</span>
        <input
          type="checkbox"
          className="size-4 rounded border-border accent-primary"
          checked={Boolean(value.inStock)}
          onChange={(e) => onChange({ ...value, inStock: e.target.checked || undefined })}
          aria-label="Solo productos con stock"
        />
      </label>

      {/* Reset button (fallback when no active indicator shown) */}
      {!hasActive && (
        <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onReset}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
