import { Skeleton } from "@/components/ui/skeleton";

export default function ChamadosLoading() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-[520px] rounded-xl" />
    </div>
  );
}
