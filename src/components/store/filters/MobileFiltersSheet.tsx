"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { FiltersPanel } from "@/components/store/filters/FiltersPanel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
};

export function MobileFiltersSheet({ categories, value, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(value);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraft(value);
        setOpen(nextOpen);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent className="max-w-sm">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Ajusta categoria, precio, stock y orden.</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <FiltersPanel categories={categories} value={draft} onChange={setDraft} onReset={() => setDraft({ sort: "RELEVANCE" })} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onReset();
                setDraft({ sort: "RELEVANCE" });
              }}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
