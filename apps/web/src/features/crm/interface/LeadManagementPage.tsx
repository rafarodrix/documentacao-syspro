"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  GripVertical,
  Info,
  KanbanSquare,
  PencilLine,
  Target,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { CRM_LEAD_STAGE_VALUES, type CrmLead, type CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  RegistryFilterGroup,
  RegistryMetricCard,
  RegistryMetrics,
  RegistryTableCard,
  RegistryToolbar,
} from "@/components/platform/shared/RegistryListScaffold";
import {
  CRM_ACTIVE_STAGE_ORDER,
  CRM_SOURCE_LABELS,
  CRM_STAGE_DESCRIPTIONS,
  CRM_STAGE_LABELS,
  CRM_STAGE_ORDER,
  formatLeadCurrency,
  type LeadDashboardData,
} from "@/features/crm/domain/model";
import { cn, formatDateSafe } from "@/lib/utils";

type LeadStatusFilter = "ACTIVE" | "CLOSED" | "WON" | "LOST";

function resolveLeadContactName(lead: CrmLead) {
  const primaryManualContact = lead.contacts.find((contact) => contact.isPrimary)?.name?.trim();
  const firstManualContact = lead.contacts.find((contact) => contact.name.trim())?.name.trim();
  return lead.primaryContactName || primaryManualContact || firstManualContact || "Sem contato vinculado";
}

function groupLeadsByStageLocal(leads: CrmLead[]) {
  return {
    LEAD: leads.filter((lead) => lead.stage === "LEAD"),
    MQL: leads.filter((lead) => lead.stage === "MQL"),
    SQL: leads.filter((lead) => lead.stage === "SQL"),
    PROPOSAL: leads.filter((lead) => lead.stage === "PROPOSAL"),
    NEGOTIATION: leads.filter((lead) => lead.stage === "NEGOTIATION"),
    WON: leads.filter((lead) => lead.stage === "WON"),
    LOST: leads.filter((lead) => lead.stage === "LOST"),
  };
}

export function LeadManagementPage({ data }: { data: LeadDashboardData }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [leads, setLeads] = useState<CrmLead[]>(data.leads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("ACTIVE");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<CrmLeadStage | null>(null);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [isStageGuideOpen, setIsStageGuideOpen] = useState(false);

  useEffect(() => {
    setLeads(data.leads);
  }, [data.leads]);

  const grouped = useMemo(() => groupLeadsByStageLocal(leads), [leads]);
  const activeLeads = useMemo(() => leads.filter((lead) => !["WON", "LOST"].includes(lead.stage)), [leads]);
  const totalPipelineValue = useMemo(
    () => activeLeads.reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0),
    [activeLeads],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (!normalizedSearch) return true;
        return [
          lead.companyName,
          lead.title,
          lead.primaryContactName,
          lead.ownerName,
          lead.nextStep,
          lead.lostReason,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch));
      }),
    [leads, normalizedSearch],
  );

  const filteredGrouped = useMemo(() => groupLeadsByStageLocal(filteredLeads), [filteredLeads]);
  const closedFilteredLeads = useMemo(() => {
    if (statusFilter === "WON") return filteredLeads.filter((lead) => lead.stage === "WON");
    if (statusFilter === "LOST") return filteredLeads.filter((lead) => lead.stage === "LOST");
    return filteredLeads.filter((lead) => lead.stage === "WON" || lead.stage === "LOST");
  }, [filteredLeads, statusFilter]);

  const stageSummaryFilters = [
    { value: "ACTIVE" as const, label: "Todos", count: activeLeads.length },
    { value: "CLOSED" as const, label: "Encerrados", count: grouped.WON.length + grouped.LOST.length },
    { value: "WON" as const, label: "Ganhos", count: grouped.WON.length },
    { value: "LOST" as const, label: "Perdidos", count: grouped.LOST.length },
  ];

  async function persistLeadUpdate(
    leadId: string,
    payload: Record<string, unknown>,
    options?: {
      successMessage?: string;
      optimisticLead?: CrmLead;
    },
  ) {
    if (!Object.keys(payload).length) {
      toast.info("Nenhuma alteracao para salvar.");
      return;
    }

    const previousLeads = leads;
    setSavingLeadId(leadId);

    if (options?.optimisticLead) {
      setLeads((current) => current.map((lead) => (lead.id === leadId ? options.optimisticLead ?? lead : lead)));
    }

    try {
      const response = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false || !result?.data) {
        setLeads(previousLeads);
        toast.error(result?.error || result?.message || "Falha ao atualizar lead.");
        return;
      }

      const updatedLead = result.data as CrmLead;
      setLeads((current) => current.map((lead) => (lead.id === leadId ? updatedLead : lead)));

      if (options?.successMessage) toast.success(options.successMessage);

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      setLeads(previousLeads);
      toast.error("Falha ao atualizar lead.");
    } finally {
      setSavingLeadId(null);
    }
  }

  function openEditor(leadId: string) {
    router.push(`/portal/comercial/leads/${leadId}/editar`);
  }

  async function handleStageChange(lead: CrmLead, nextStage: CrmLeadStage) {
    if (lead.stage === nextStage || savingLeadId) return;

    if (nextStage === "LOST" && !(lead.lostReason ?? "").trim()) {
      openEditor(lead.id);
      toast.info("Informe o motivo da perda para encerrar o lead.");
      return;
    }

    await persistLeadUpdate(
      lead.id,
      { stage: nextStage },
      {
        successMessage: `Lead movido para ${CRM_STAGE_LABELS[nextStage]}.`,
        optimisticLead: {
          ...lead,
          stage: nextStage,
        },
      },
    );
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, leadId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", leadId);
    setDraggedLeadId(leadId);
  }

  function handleDragEnd() {
    setDraggedLeadId(null);
    setHoveredStage(null);
  }

  async function handleDrop(stage: CrmLeadStage) {
    if (!draggedLeadId) return;
    const draggedLead = leads.find((lead) => lead.id === draggedLeadId);
    setHoveredStage(null);
    setDraggedLeadId(null);
    if (!draggedLead) return;
    await handleStageChange(draggedLead, stage);
  }

  return (
    <>
      <div className="space-y-5 pb-20">
        <RegistryMetrics>
          <RegistryMetricCard title="Leads ativos" value={activeLeads.length} description="Oportunidades em andamento" icon={Target} tone="info" />
          <RegistryMetricCard title="Em proposta" value={grouped.PROPOSAL.length} description="Leads com proposta aberta" icon={KanbanSquare} tone="warning" />
          <RegistryMetricCard title="Pipeline" value={formatLeadCurrency(totalPipelineValue)} description="Valor total estimado" icon={CircleDollarSign} tone="success" />
          <RegistryMetricCard title="Fechamento" value={grouped.NEGOTIATION.length} description="Negocios em fase final" icon={BadgeCheck} tone="neutral" />
        </RegistryMetrics>

        <RegistryToolbar
          searchValue={search}
          searchPlaceholder="Buscar empresa, titulo, contato ou proximo passo..."
          onSearchChange={setSearch}
          onClearSearch={() => setSearch("")}
          resultLabel={`${statusFilter === "ACTIVE" ? activeLeads.filter((lead) => filteredLeads.some((item) => item.id === lead.id)).length : closedFilteredLeads.length} filtrados`}
          filters={
            <RegistryFilterGroup
              value={statusFilter}
              onChange={setStatusFilter}
              options={stageSummaryFilters}
            />
          }
          actions={
            <>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setIsStageGuideOpen(true)}>
                <Info className="h-4 w-4" />
                Etapas
              </Button>
              <Button asChild size="sm" className="h-9 gap-2">
                <Link href="/portal/comercial/leads/novo">
                  <ArrowRight className="h-4 w-4" />
                  Novo lead
                </Link>
              </Button>
            </>
          }
        />

        <RegistryTableCard>
          <CardHeader className="pb-0">
            <div className="flex flex-wrap gap-2">
              {statusFilter === "ACTIVE"
                ? CRM_ACTIVE_STAGE_ORDER.map((stage) => (
                    <Badge key={stage} variant="outline" className="gap-2 rounded-full px-3 py-1 text-xs">
                      <span>{CRM_STAGE_LABELS[stage]}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                        {filteredGrouped[stage].length}
                      </span>
                    </Badge>
                  ))
                : null}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {leads.length === 0 ? (
              <EmptyPipelineState />
            ) : statusFilter === "ACTIVE" ? (
              <div className="space-y-4">
                {filteredLeads.filter((lead) => CRM_ACTIVE_STAGE_ORDER.includes(lead.stage)).length === 0 ? (
                  <FilteredEmptyState search={search} statusLabel="pipeline ativo" />
                ) : (
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-4">
                      {CRM_ACTIVE_STAGE_ORDER.map((stage) => {
                        const stageLeads = filteredGrouped[stage];
                        return (
                          <section
                            key={stage}
                            className={cn(
                              "w-[320px] shrink-0 rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors",
                              hoveredStage === stage && "border-primary/50 bg-primary/5",
                            )}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (draggedLeadId) setHoveredStage(stage);
                            }}
                            onDragLeave={() => setHoveredStage((current) => (current === stage ? null : current))}
                            onDrop={async (event) => {
                              event.preventDefault();
                              await handleDrop(stage);
                            }}
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{CRM_STAGE_LABELS[stage]}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{CRM_STAGE_DESCRIPTIONS[stage]}</p>
                              </div>
                              <Badge variant="secondary" className="shrink-0 rounded-full px-2.5">
                                {stageLeads.length}
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              {stageLeads.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/60 bg-background/70 px-3 py-8 text-center text-xs text-muted-foreground">
                                  Nenhum lead nesta etapa.
                                </div>
                              ) : (
                                stageLeads.map((lead) => (
                                  <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    isSaving={savingLeadId === lead.id || isRefreshing}
                                    onEdit={() => openEditor(lead.id)}
                                    onStageChange={(nextStage) => handleStageChange(lead, nextStage)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                ))
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : closedFilteredLeads.length === 0 ? (
              <FilteredEmptyState
                search={search}
                statusLabel={
                  statusFilter === "WON" ? "ganhos" : statusFilter === "LOST" ? "perdidos" : "encerrados"
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {closedFilteredLeads.map((lead) => (
                  <ClosedLeadCard
                    key={lead.id}
                    lead={lead}
                    isSaving={savingLeadId === lead.id || isRefreshing}
                    onEdit={() => openEditor(lead.id)}
                    onStageChange={(nextStage) => handleStageChange(lead, nextStage)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </RegistryTableCard>
      </div>

      <Dialog open={isStageGuideOpen} onOpenChange={setIsStageGuideOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Como interpretar as etapas</DialogTitle>
            <DialogDescription>
              Este apoio reduz duvida operacional e ajuda o time a mover o lead no momento certo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {CRM_STAGE_ORDER.map((stage) => (
              <div key={stage} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{CRM_STAGE_LABELS[stage]}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{CRM_STAGE_DESCRIPTIONS[stage]}</p>
                  </div>
                  <Badge variant={CRM_ACTIVE_STAGE_ORDER.includes(stage) ? "secondary" : "outline"}>
                    {CRM_ACTIVE_STAGE_ORDER.includes(stage) ? "Etapa ativa" : "Resultado"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
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

function FilteredEmptyState({
  search,
  statusLabel,
}: {
  search: string;
  statusLabel: string;
}) {
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

function LeadCard({
  lead,
  isSaving,
  onEdit,
  onStageChange,
  onDragStart,
  onDragEnd,
}: {
  lead: CrmLead;
  isSaving: boolean;
  onEdit: () => void;
  onStageChange: (stage: CrmLeadStage) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, leadId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable={!isSaving}
      onDragStart={(event) => onDragStart(event, lead.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border border-border/60 bg-background p-3 shadow-sm transition-opacity",
        isSaving && "cursor-wait opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 rounded-md border border-border/60 p-1 text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">{lead.companyName}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{lead.title}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} disabled={isSaving}>
          <PencilLine className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2 text-xs text-muted-foreground">
        <LeadMeta icon={UserRound} text={resolveLeadContactName(lead)} />
        <LeadMeta text={CRM_SOURCE_LABELS[lead.source]} />
        <LeadMeta text={formatLeadCurrency(lead.estimatedValue)} />
        {lead.expectedCloseAt ? <LeadMeta text={`Fechamento: ${formatDateSafe(lead.expectedCloseAt)}`} /> : null}
        {lead.nextStep ? <LeadMeta text={lead.nextStep} /> : null}
      </div>

      <div className="mt-4 grid gap-2">
        <Select value={lead.stage} onValueChange={(value) => onStageChange(value as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger>
            <SelectValue placeholder="Mover etapa" />
          </SelectTrigger>
          <SelectContent>
            {CRM_LEAD_STAGE_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {CRM_STAGE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ClosedLeadCard({
  lead,
  isSaving,
  onEdit,
  onStageChange,
}: {
  lead: CrmLead;
  isSaving: boolean;
  onEdit: () => void;
  onStageChange: (stage: CrmLeadStage) => void;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-muted/20 p-4", isSaving && "opacity-60")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lead.stage === "WON" ? "default" : "outline"}>{CRM_STAGE_LABELS[lead.stage]}</Badge>
            <Badge variant="secondary">{CRM_SOURCE_LABELS[lead.source]}</Badge>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{lead.companyName}</p>
            <p className="text-sm text-muted-foreground">{lead.title}</p>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onEdit} disabled={isSaving}>
          <PencilLine className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Contato</p>
          <p className="mt-1">{resolveLeadContactName(lead)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Valor</p>
          <p className="mt-1">{formatLeadCurrency(lead.estimatedValue)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Fechamento previsto</p>
          <p className="mt-1">{formatDateSafe(lead.expectedCloseAt, "Nao informado")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">{lead.stage === "LOST" ? "Motivo da perda" : "Proximo passo"}</p>
          <p className="mt-1">{lead.stage === "LOST" ? lead.lostReason || "Nao informado" : lead.nextStep || "Nao informado"}</p>
        </div>
      </div>

      <div className="mt-4">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mover para</Label>
        <Select value={lead.stage} onValueChange={(value) => onStageChange(value as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRM_LEAD_STAGE_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {CRM_STAGE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
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
