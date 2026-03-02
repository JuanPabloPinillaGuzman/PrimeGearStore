"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

export function FiltersPanel({ categories, value, onChange, onReset, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="categoryId" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Categoria
          </label>
          <Select
            id="categoryId"
            value={value.categoryId ?? ""}
            onChange={(event) => onChange({ ...value, categoryId: event.target.value || undefined })}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name} ({category.activeProductsCount})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="minPrice" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Precio min
            </label>
            <Input
              id="minPrice"
              inputMode="numeric"
              placeholder="0"
              value={value.minPrice ?? ""}
              onChange={(event) => onChange({ ...value, minPrice: event.target.value || undefined })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="maxPrice" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Precio max
            </label>
            <Input
              id="maxPrice"
              inputMode="numeric"
              placeholder="999000"
              value={value.maxPrice ?? ""}
              onChange={(event) => onChange({ ...value, maxPrice: event.target.value || undefined })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="sort" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Ordenar por
          </label>
          <Select
            id="sort"
            value={value.sort ?? "RELEVANCE"}
            onChange={(event) => onChange({ ...value, sort: event.target.value || undefined })}
          >
            <option value="RELEVANCE">Relevancia</option>
            <option value="NEWEST">Mas nuevos</option>
            <option value="PRICE_ASC">Precio: menor a mayor</option>
            <option value="PRICE_DESC">Precio: mayor a menor</option>
            <option value="TOP_SELLERS">Mas vendidos</option>
          </Select>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border accent-[hsl(var(--primary))]"
            checked={Boolean(value.inStock)}
            onChange={(event) => onChange({ ...value, inStock: event.target.checked || undefined })}
            aria-label="Solo productos con stock"
          />
          <span>Solo con stock</span>
        </label>

        <Button type="button" variant="outline" className="w-full" onClick={onReset}>
          Limpiar filtros
        </Button>
      </CardContent>
    </Card>
  );
}

