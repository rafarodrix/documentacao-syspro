import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ----------------------------------------------------------------------
// 1. Esqueleto do Card de Mês (Usado na ReleasesIndexSkeleton)
// ----------------------------------------------------------------------
function MonthCardSkeleton() {
  return (
    <Card className="h-full flex flex-col border-border/50 bg-background/50">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16 rounded-full" /> {/* Badge Ano */}
          <Skeleton className="h-5 w-20 rounded-full" /> {/* Badge Novo */}
        </div>
        <Skeleton className="h-7 w-32" /> {/* Título Mês */}
        <Skeleton className="h-4 w-full" /> {/* Descrição linha 1 */}
        <Skeleton className="h-4 w-2/3" />  {/* Descrição linha 2 */}
      </CardHeader>

      <CardContent className="mt-auto pb-4">
        <Separator className="mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-md" /> {/* Stats Melhorias */}
          <Skeleton className="h-9 w-full rounded-md" /> {/* Stats Bugs */}
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// 2. Esqueleto do Card de Item (Usado na ReleasesPageSkeleton)
// ----------------------------------------------------------------------
function ReleaseItemSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-24 rounded-full" /> {/* Badge Tipo */}
        <Skeleton className="h-5 w-5 rounded-full" />  {/* Ícone Ação */}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" /> {/* Título Release */}
        <Skeleton className="h-4 w-full" /> {/* Resumo linha 1 */}
        <Skeleton className="h-4 w-5/6" />  {/* Resumo linha 2 */}
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-16 rounded-md" /> {/* Tag 1 */}
        <Skeleton className="h-5 w-20 rounded-md" /> {/* Tag 2 */}
      </div>
    </div>
  );
}

// ======================================================================
// COMPONENTE PRINCIPAL: PÁGINA DE ÍNDICE (Anual)
// ======================================================================
export function ReleasesIndexSkeleton() {
  return (
    <div className="space-y-16 py-8 mx-auto w-full max-w-6xl">
      {/* Simulando 2 anos de histórico */}
      {[1, 2].map((i) => (
        <section key={i} className="relative">
          {/* Cabeçalho do Ano */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-24" /> {/* Título 2024 */}
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Grid de Meses */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MonthCardSkeleton />
            <MonthCardSkeleton />
            <MonthCardSkeleton />
          </div>
        </section>
      ))}
    </div>
  );
}

// ======================================================================
// COMPONENTE PRINCIPAL: PÁGINA DO MÊS (Detalhes)
// ======================================================================
export function ReleasesPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 animate-in fade-in duration-500">
      {/* 1. Área de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <Skeleton className="h-10 w-full md:max-w-sm rounded-lg" /> {/* Input Busca */}
        <Skeleton className="h-9 w-full md:w-64 rounded-lg" />      {/* Botões Filtro */}
      </div>

      <div className="space-y-10">
        {/* 2. Seção Melhorias */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Ícone Rocket */}
            <Skeleton className="h-7 w-48" />           {/* Título Seção */}
          </div>
          <div className="grid grid-cols-1 gap-4">
            <ReleaseItemSkeleton />
            <ReleaseItemSkeleton />
            <ReleaseItemSkeleton />
          </div>
        </section>

        {/* 3. Seção Bugs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Ícone Bug */}
            <Skeleton className="h-7 w-40" />           {/* Título Seção */}
          </div>
          <div className="grid grid-cols-1 gap-4">
            <ReleaseItemSkeleton />
            <ReleaseItemSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}