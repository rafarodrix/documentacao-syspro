import { ReleasesPageSkeleton } from "@/components/releases/ReleasesSkeleton";

export default function Loading() {
  return (
    <div className="py-6">
      <ReleasesPageSkeleton />
    </div>
  );
}
