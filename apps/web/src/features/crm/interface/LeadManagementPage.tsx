import Link from "next/link";
import { BadgeCheck, CircleDollarSign, KanbanSquare, Plus, Target, UserRound } from "lucide-react";
import type { CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS, formatLeadCurrency, type LeadDashboardData } from "@/features/crm/domain/model";
import { groupLeadsByStage } from "@/features/crm/application/queries";

const STAGE_ORDER: CrmLeadStage[] = ["LEAD", "MQL", "SQL", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export function LeadManagementPage({ data }: { data: LeadDashboardData }) {
  const { leads } = data;
  const grouped = groupLeadsByStage(leads);
  const activeLeads = leads.filter((lead) => lead.stage !== "WON" && lead.stage !== "LOST");
  const totalPipelineValue = activeLeads.reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CRM Comercial</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Lead fica separado de empresa cliente e pode se vincular a um contato existente. A empresa so entra no cadastro formal quando houver conversao real.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/portal/comercial/leads/novo">
            <Plus className="h-4 w-4" />
            Novo lead
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Leads ativos" value={String(activeLeads.length)} icon={Target} tone="blue" />
        <MetricCard title="Em proposta" value={String(grouped.PROPOSAL.length)} icon={KanbanSquare} tone="amber" />
        <MetricCard title="Pipeline estimado" value={formatLeadCurrency(totalPipelineValue)} icon={CircleDollarSign} tone="emerald" />
        <MetricCard title="Prontos p/ fechar" value={String(grouped.NEGOTIATION.length)} icon={BadgeCheck} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Pipeline de leads</CardTitle>
              <CardDescription>
                Estrutura inicial com nomenclatura padrao: Lead, MQL, SQL, Proposta, Negociacao, Ganho e Perdido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-4">
                {STAGE_ORDER.map((stage) => {
                  const stageLeads = grouped[stage];
                  return (
                    <div key={stage} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{CRM_STAGE_LABELS[stage]}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {stage === "LEAD" && "Entrada inicial para qualificar."}
                            {stage === "MQL" && "Lead com aderencia inicial validada."}
                            {stage === "SQL" && "Lead aceito pelo time comercial."}
                            {stage === "PROPOSAL" && "Levantamento, demo ou proposta em curso."}
                            {stage === "NEGOTIATION" && "Condicoes comerciais em fechamento."}
                            {stage === "WON" && "Lead convertido em cliente."}
                            {stage === "LOST" && "Lead encerrado sem conversao."}
                          </p>
                        </div>
                        <Badge variant="outline">{stageLeads.length}</Badge>
                      </div>

                      <div className="space-y-3">
                        {stageLeads.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-5 text-center text-xs text-muted-foreground">
                            Sem leads nesta etapa.
                          </div>
                        ) : (
                          stageLeads.map((lead) => (
                            <div key={lead.id} className="rounded-lg border border-border/60 bg-background p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">{lead.companyName}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{lead.title}</p>
                                </div>
                                <Badge variant="secondary" className="shrink-0">{lead.stage}</Badge>
                              </div>

                              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                                <LeadMeta icon={UserRound} text={lead.contactName || "Sem contato vinculado"} />
                                <LeadMeta text={CRM_SOURCE_LABELS[lead.source]} />
                                <LeadMeta text={formatLeadCurrency(lead.estimatedValue)} />
                                <LeadMeta text={lead.nextStep || "Sem proxima acao definida"} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Regra de negocio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Lead nao cria empresa automaticamente.</p>
              <p>Contato pode ser vinculado desde o inicio para preservar relacionamento.</p>
              <p>Empresa prospect fica registrada no proprio lead ate a conversao.</p>
              <p>Depois do ganho, o fluxo pode seguir para empresa, contrato e onboarding.</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do funil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryLine label="Total de leads" value={String(leads.length)} />
              <SummaryLine label="Ganho" value={String(grouped.WON.length)} />
              <SummaryLine label="Perdido" value={String(grouped.LOST.length)} />
              <SummaryLine label="Com contato" value={String(leads.filter((lead) => lead.contactId).length)} />
              <SummaryLine label="Com valor estimado" value={String(leads.filter((lead) => typeof lead.estimatedValue === "number").length)} />
            </CardContent>
          </Card>
        </aside>
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
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
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
      <span>{text}</span>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
