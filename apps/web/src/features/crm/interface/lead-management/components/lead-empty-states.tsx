import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Button } from "@dosc-syspro/ui";

export function EmptyPipelineState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Nenhum lead cadastrado</h3>
          <p className="text-sm text-muted-foreground">
            Comece registrando a primeira oportunidade comercial para alimentar o funil.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/portal/comercial/leads/novo">
            Criar primeiro lead
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function FilteredEmptyState({ search, statusLabel }: { search: string; statusLabel: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
      <div className="mx-auto max-w-md space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Nenhum lead encontrado</h3>
        <p className="text-sm text-muted-foreground">
          {search.trim()
            ? `Nenhum registro de ${statusLabel} corresponde ao termo "${search.trim()}".`
            : `Nao ha registros disponiveis em ${statusLabel}.`}
        </p>
      </div>
    </div>
  );
}
