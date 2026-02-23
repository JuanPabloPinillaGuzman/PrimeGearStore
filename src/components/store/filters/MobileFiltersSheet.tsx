"use client";

import { SlidersHorizontal } from "lucide-react";

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
  return (
    <Sheet>
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
          <FiltersPanel categories={categories} value={value} onChange={onChange} onReset={onReset} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

