import { ReleasesPageSkeleton } from "@/components/releases/ReleasesSkeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-5xl py-10">
      <ReleasesPageSkeleton />
    </div>
  );
}
