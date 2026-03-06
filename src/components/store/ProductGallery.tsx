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
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
        <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-muted to-muted/30">
          <span className="font-display text-sm font-bold tracking-[0.3em] text-muted-foreground/40">
            {fallbackLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="group relative aspect-square overflow-hidden rounded-3xl border border-border/70 bg-card">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={active.url}
            custom={direction}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={active.url}
              alt={active.alt ?? fallbackLabel}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
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
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-all duration-150",
                index === selectedIndex
                  ? "border-primary shadow-sm ring-2 ring-primary/30"
                  : "border-border/60 opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt={image.alt ?? fallbackLabel}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
