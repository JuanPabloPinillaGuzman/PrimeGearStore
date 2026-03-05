"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pages = getPageNumbers(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total} resultado{total !== 1 ? "s" : ""}
      </p>

      <nav aria-label="Paginación" className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="Página anterior"
          className={cn(
            "flex size-9 items-center justify-center rounded-xl border text-sm transition-colors",
            canPrev
              ? "border-border/60 bg-card hover:bg-muted hover:text-foreground text-muted-foreground"
              : "pointer-events-none border-border/30 bg-card/40 text-muted-foreground/40",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex size-9 items-center justify-center text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                p === page
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p}
              {/* Active dot indicator */}
              {p === page && (
                <span className="absolute -bottom-2.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="Página siguiente"
          className={cn(
            "flex size-9 items-center justify-center rounded-xl border text-sm transition-colors",
            canNext
              ? "border-border/60 bg-card hover:bg-muted hover:text-foreground text-muted-foreground"
              : "pointer-events-none border-border/30 bg-card/40 text-muted-foreground/40",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
