import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-3 w-10" />
        <span className="text-border">/</span>
        <Skeleton className="h-3 w-20" />
        <span className="text-border">/</span>
        <Skeleton className="h-3 w-32" />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-16 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-8 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
