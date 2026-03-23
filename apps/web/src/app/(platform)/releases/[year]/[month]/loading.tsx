import { ReleasesPageSkeleton } from "@/components/releases/ReleasesSkeleton";

export default function Loading() {
  return (
    <div className="container max-w-5xl py-10 mx-auto">
      <ReleasesPageSkeleton />
    </div>
  );
}