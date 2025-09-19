import { Heading } from "fumadocs-ui/components/heading";
import { FaRocket, FaBug } from "react-icons/fa";

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`rounded-lg bg-muted/80 ${className}`} />
);

// Esqueleto para a PÁGINA DE ÍNDICE
export function ReleasesIndexSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 p-4 animate-pulse">
      <div className="mb-8 text-center">
        <SkeletonBox className="h-10 w-3/4 mx-auto mb-4" />
        <SkeletonBox className="h-6 w-1/2 mx-auto" />
      </div>
      <section>
        <SkeletonBox className="h-10 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonBox className="h-36" />
          <SkeletonBox className="h-36" />
          <SkeletonBox className="h-36" />
        </div>
      </section>
    </div>
  );
}

// NOVO ESQUELETO: Para a PÁGINA DO MÊS
export function ReleasesPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-8">
      <SkeletonBox className="inline-flex h-8 w-60" />
      <SkeletonBox className="h-10 w-3/4" />
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <FaRocket /> Melhorias Implementadas
          </h2>
          <div className="space-y-3">
            <SkeletonBox className="h-24 w-full" />
            <SkeletonBox className="h-24 w-full" />
          </div>
        </section>
        <section>
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <FaBug /> Bugs Corrigidos
          </h2>
          <div className="space-y-3">
            <SkeletonBox className="h-24 w-full" />
          </div>
        </section>
      </div>
    </div>
  );
}