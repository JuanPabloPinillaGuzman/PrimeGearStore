import { Suspense } from "react";

import { StoreHeader } from "@/components/store/StoreHeader";

export default function StoreGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Suspense fallback={<div className="sticky top-0 z-40 h-16 border-b border-border/60 bg-background/80" />}>
        <StoreHeader />
      </Suspense>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6">{children}</div>
    </div>
  );
}
