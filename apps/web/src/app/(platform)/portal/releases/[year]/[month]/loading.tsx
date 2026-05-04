import { ReleasesPageSkeleton } from "@/components/releases/releases-skeleton";

export default function Loading() {
  return (
    <div className="py-6">
      <ReleasesPageSkeleton />
    </div>
  );
}
