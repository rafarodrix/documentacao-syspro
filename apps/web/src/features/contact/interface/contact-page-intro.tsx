import { Building2, FileText, PencilLine, UserRound } from "lucide-react";

type ContactPageIntroProps = {
  mode: "create" | "edit";
  companyCount: number;
  contactName?: string;
};

export function ContactPageIntro({ mode, companyCount, contactName }: ContactPageIntroProps) {
  const isEdit = mode === "edit";

  return (
    <section className="rounded-2xl border border-border/60 bg-linear-to-br from-background via-card to-muted/20 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Primeiro Passe DESIGN.md
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {isEdit ? "Refinar vínculo e identidade do contato" : "Cadastrar contato com estrutura mais clara"}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {isEdit
              ? "Revise identidade, canais e empresas vinculadas com uma leitura mais neutra, direta e operacional."
              : "Organize identidade, canais e empresas vinculadas em uma sequência curta, previsível e fácil de revisar."}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:w-[30rem]">
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Modo</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              {isEdit ? <PencilLine className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {isEdit ? "Edição" : "Cadastro"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contato</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound className="h-4 w-4" />
              <span className="truncate">{contactName?.trim() || "Novo registro"}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Empresas disponíveis</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="h-4 w-4" />
              {companyCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
