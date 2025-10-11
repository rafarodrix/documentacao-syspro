// Componente de carregamento para a página de detalhes de lançamentos
// Mostra um esqueleto de carregamento enquanto os dados são buscados

import { FaRocket, FaBug } from "react-icons/fa";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-8">
      <div className="inline-flex h-8 w-60 items-center gap-2 rounded-md bg-muted/80"></div>
      <div className="h-10 w-3/4 rounded-lg bg-muted/80"></div>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <FaRocket /> Melhorias Implementadas
          </h2>
          <div className="space-y-3">
            <div className="h-24 w-full rounded-lg bg-muted/60"></div>
            <div className="h-24 w-full rounded-lg bg-muted/60"></div>
          </div>
        </section>
        <section>
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <FaBug /> Bugs Corrigidos
          </h2>
          <div className="space-y-3">
            <div className="h-24 w-full rounded-lg bg-muted/60"></div>
          </div>
        </section>
      </div>
    </div>
  );
}