import { Card, Skeleton } from "@dosc-syspro/ui";

export default function TicketsLoading() {
  return (
    <div className="animate-pulse space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 shrink-0" />
      </div>

      {/* Filters section */}
      <div className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex gap-1 rounded-md bg-muted/40 p-1">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
          </div>
        </div>
      </div>

      {/* Table — desktop */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <div className="flex items-center gap-6 border-b border-border/60 bg-muted/40 px-4 py-3">
            {["w-16", "w-56", "w-36", "w-24", "w-20", "w-20", "w-20", "w-14"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w} shrink-0`} />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 px-4 py-4"
                style={{ opacity: 1 - i * 0.09 }}
              >
                <Skeleton className="h-6 w-14 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-32 shrink-0" />
                <Skeleton className="h-4 w-20 shrink-0" />
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-14 shrink-0" />
                <Skeleton className="h-7 w-14 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile */}
        <div className="divide-y divide-border/60 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4" style={{ opacity: 1 - i * 0.18 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="ml-auto h-3 w-14" />
              </div>
              <Skeleton className="ml-auto h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
