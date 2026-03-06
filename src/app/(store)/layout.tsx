import { Suspense } from "react";

import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";

export default function StoreGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense
        fallback={
          <div className="sticky top-0 z-40 h-14 border-b border-border/60 glass" />
        }
      >
        <StoreHeader />
      </Suspense>

      <main className="flex-1">{children}</main>

      <StoreFooter />
    </div>
  );
}
