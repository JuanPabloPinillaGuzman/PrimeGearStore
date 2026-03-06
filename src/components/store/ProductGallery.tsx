"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type GalleryImage = {
  url: string;
  alt: string | null;
};

export function ProductGallery({
  images,
  fallbackLabel,
}: {
  images: GalleryImage[];
  fallbackLabel: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const normalizedImages = useMemo(() => images.filter((img) => !!img.url), [images]);
  const active = normalizedImages[selectedIndex] ?? normalizedImages[0] ?? null;

  function selectImage(index: number) {
    setDirection(index > selectedIndex ? 1 : -1);
    setSelectedIndex(index);
  }

  if (!active) {
    return (
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-muted/20">
        <div className="flex w-full max-h-[520px] min-h-[280px] items-center justify-center py-16">
          <span className="font-display text-sm font-bold tracking-[0.3em] text-muted-foreground/40">
            {fallbackLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image — contain so no part of the product is ever clipped */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-border/70 bg-white dark:bg-neutral-950">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={active.url}
            custom={direction}
            initial={{ opacity: 0, x: direction * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex w-full items-center justify-center"
          >
            <Image
              src={active.url}
              alt={active.alt ?? fallbackLabel}
              width={800}
              height={600}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="h-auto max-h-[520px] w-full object-contain"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {normalizedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {normalizedImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              aria-label={`Ver imagen ${index + 1}`}
              onClick={() => selectImage(index)}
              className={cn(
                "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white dark:bg-neutral-950 transition-all duration-150",
                index === selectedIndex
                  ? "border-primary shadow-sm ring-2 ring-primary/30"
                  : "border-border/60 opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt={image.alt ?? fallbackLabel}
                width={80}
                height={80}
                sizes="80px"
                className="h-full w-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
