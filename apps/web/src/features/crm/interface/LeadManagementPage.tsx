import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleDollarSign, KanbanSquare, Plus, Target, UserRound } from "lucide-react";
import type { CrmLead, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS, formatLeadCurrency, type LeadDashboardData } from "@/features/crm/domain/model";
import { groupLeadsByStage } from "@/features/crm/application/queries";

const STAGE_ORDER: CrmLeadStage[] = ["LEAD", "MQL", "SQL", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

function resolveLeadContactName(lead: CrmLead) {
  const primaryManualContact = lead.contacts.find((contact) => contact.isPrimary)?.name?.trim();
  const firstManualContact = lead.contacts.find((contact) => contact.name.trim())?.name.trim();
  return lead.primaryContactName || primaryManualContact || firstManualContact || "Sem contato vinculado";
}

export function LeadManagementPage({ data }: { data: LeadDashboardData }) {
  const { leads } = data;
  const grouped = groupLeadsByStage(leads);
  const activeLeads = leads.filter((lead) => lead.stage !== "WON" && lead.stage !== "LOST");
  const totalPipelineValue = activeLeads.reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CRM Comercial</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Gestao de oportunidades da area comercial, com lead separado do cadastro formal de clientes.
          </p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <Link href="/portal/comercial/leads/novo">
            <Plus className="h-4 w-4" />
            Novo lead
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Leads ativos" value={String(activeLeads.length)} icon={Target} tone="blue" />
        <MetricCard title="Em proposta" value={String(grouped.PROPOSAL.length)} icon={KanbanSquare} tone="amber" />
        <MetricCard title="Pipeline" value={formatLeadCurrency(totalPipelineValue)} icon={CircleDollarSign} tone="emerald" />
        <MetricCard title="Fechamento" value={String(grouped.NEGOTIATION.length)} icon={BadgeCheck} tone="violet" />
      </div>

      <Card className="border-border/60">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Pipeline</CardTitle>
              <CardDescription>
                Etapas padrao para acompanhar qualificacao, proposta e fechamento.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAGE_ORDER.map((stage) => (
                <Badge key={stage} variant="outline" className="gap-2 rounded-full px-3 py-1 text-xs">
                  <span>{CRM_STAGE_LABELS[stage]}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                    {grouped[stage].length}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <EmptyPipelineState />
          ) : (
            <div className="grid gap-4 xl:grid-cols-4">
              {STAGE_ORDER.map((stage) => {
                const stageLeads = grouped[stage];
                return (
                  <section key={stage} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{CRM_STAGE_LABELS[stage]}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {stage === "LEAD" && "Entrada inicial"}
                          {stage === "MQL" && "Qualificacao inicial"}
                          {stage === "SQL" && "Lead aceito pelo comercial"}
                          {stage === "PROPOSAL" && "Proposta ou demonstracao"}
                          {stage === "NEGOTIATION" && "Fechamento em andamento"}
                          {stage === "WON" && "Convertido em cliente"}
                          {stage === "LOST" && "Encerrado sem conversao"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 rounded-full px-2.5">
                        {stageLeads.length}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {stageLeads.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 bg-background/70 px-3 py-6 text-center text-xs text-muted-foreground">
                          Nenhum lead aqui.
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <div key={lead.id} className="rounded-xl border border-border/60 bg-background p-3">
                            <div className="space-y-1">
                              <p className="truncate text-sm font-semibold text-foreground">{lead.companyName}</p>
                              <p className="line-clamp-2 text-xs text-muted-foreground">{lead.title}</p>
                            </div>

                            <Separator className="my-3" />

                            <div className="space-y-2 text-xs text-muted-foreground">
                              <LeadMeta icon={UserRound} text={resolveLeadContactName(lead)} />
                              <LeadMeta text={CRM_SOURCE_LABELS[lead.source]} />
                              <LeadMeta text={formatLeadCurrency(lead.estimatedValue)} />
                              {lead.nextStep ? <LeadMeta text={lead.nextStep} /> : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyPipelineState() {
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

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: typeof Target;
  tone: "blue" | "amber" | "emerald" | "violet";
}) {
  const toneClass = {
    blue: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  }[tone];

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function LeadMeta({
  icon: Icon,
  text,
}: {
  icon?: typeof UserRound;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
      <span className="line-clamp-2">{text}</span>
    </div>
  );
}
