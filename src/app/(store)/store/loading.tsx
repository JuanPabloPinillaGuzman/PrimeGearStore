import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Filter bar skeleton */}
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
        <div className="ml-auto">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar skeleton */}
        <div className="hidden space-y-5 lg:block">
          <Skeleton className="h-4 w-16" />
          <div className="h-px bg-border/50" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
