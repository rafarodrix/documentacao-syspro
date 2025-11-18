// Componente de carregamento para a página de notas de lançamento
// Mostra um esqueleto de carregamento enquanto os dados são buscados

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`rounded-lg bg-muted/80 ${className}`} />
);

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 animate-pulse p-4">
      <div className="mb-16 text-center">
        <SkeletonBox className="h-10 w-3/4 mx-auto mb-4" />
        <SkeletonBox className="h-6 w-1/2 mx-auto" />
      </div>

      <section>
        <SkeletonBox className="h-10 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonBox className="h-36" />
          <SkeletonBox className="h-36" />
          <SkeletonBox className="h-36" />
        </div>
      </section>
    </div>
  );
}