import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="hidden space-y-1 lg:block">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </aside>

        {/* Content area */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
