import { Skeleton } from "@/components/ui/skeleton";

export default function AppDashboardLoading() {
  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-4">
        <Skeleton className="h-72 w-full rounded-xl xl:col-span-4" />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
        <Skeleton className="h-96 w-full rounded-xl xl:col-span-4" />
        <Skeleton className="h-96 w-full rounded-xl xl:col-span-3" />
      </div>
    </div>
  );
}
