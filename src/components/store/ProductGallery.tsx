"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type GalleryImage = {
  url: string;
  alt: string | null;
};

export function ProductGallery({ images, fallbackLabel }: { images: GalleryImage[]; fallbackLabel: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const normalizedImages = useMemo(() => images.filter((img) => !!img.url), [images]);
  const active = normalizedImages[selectedIndex] ?? normalizedImages[0] ?? null;

  if (!active) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
        <div className="flex h-[22rem] items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/40 text-xs tracking-[0.2em] text-muted-foreground">
          {fallbackLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <Image
          src={active.url}
          alt={active.alt ?? fallbackLabel}
          width={1200}
          height={900}
          priority
          className="h-[22rem] w-full object-cover md:h-[30rem]"
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {normalizedImages.slice(0, 4).map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            type="button"
            aria-label={`Ver imagen ${index + 1}`}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "overflow-hidden rounded-lg border bg-background transition",
              index === selectedIndex
                ? "border-foreground/30 shadow-sm"
                : "border-border/60 hover:border-border",
            )}
          >
            <Image
              src={image.url}
              alt={image.alt ?? fallbackLabel}
              width={200}
              height={160}
              className="h-16 w-full object-cover"
            />
          </button>
        ))}
        {normalizedImages.length === 1 &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/40 text-[10px] text-muted-foreground"
            >
              PRIME
            </div>
          ))}
      </div>
    </div>
  );
}
