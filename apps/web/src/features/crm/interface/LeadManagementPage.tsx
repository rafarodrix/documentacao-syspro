"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  GripVertical,
  Info,
  KanbanSquare,
  PencilLine,
  Target,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { CrmLead, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
  RegistryTableCard,
  RegistryToolbar,
} from "@/components/platform/shared/RegistryListScaffold";
import {
  CRM_ACTIVE_STAGE_ORDER,
  CRM_SOURCE_LABELS,
  CRM_STAGE_LABELS,
  formatLeadCurrency,
  type LeadDashboardData,
} from "@/features/crm/domain/crm.types";
import { cn, formatDateSafe } from "@/lib/utils";

type LeadStatusFilter = "ACTIVE" | "WON" | "LOST";
type LeadAttentionFilter = "ALL" | "OVERDUE" | "NO_NEXT_STEP" | "DUE_SOON";
type PipelineColumnId = "LEAD" | "VALIDATION" | "PROPOSAL" | "NEGOTIATION";

const DUE_SOON_DAYS = 7;
const STALE_LEAD_DAYS = 7;
const PIPELINE_COLUMNS: Array<{
  id: PipelineColumnId;
  label: string;
  description: string;
  stages: CrmLeadStage[];
  dropStage: CrmLeadStage;
}> = [
  {
    id: "LEAD",
    label: "Lead",
    description: "Entrada inicial.",
    stages: ["LEAD"],
    dropStage: "LEAD",
  },
  {
    id: "VALIDATION",
    label: "Validacao",
    description: "Comercial validando aderencia.",
    stages: ["MQL", "SQL"],
    dropStage: "SQL",
  },
  {
    id: "PROPOSAL",
    label: "Proposta",
    description: "Proposta ou demo comercial.",
    stages: ["PROPOSAL"],
    dropStage: "PROPOSAL",
  },
  {
    id: "NEGOTIATION",
    label: "Negociacao",
    description: "Ajustes finais para fechamento.",
    stages: ["NEGOTIATION"],
    dropStage: "NEGOTIATION",
  },
];
const STAGE_GUIDE_ITEMS = [
  ...PIPELINE_COLUMNS.map((column) => ({
    id: column.id,
    label: column.label,
    description: column.description,
    active: true,
  })),
  {
    id: "WON",
    label: CRM_STAGE_LABELS.WON,
    description: "Negocio ganho e convertido em cliente.",
    active: false,
  },
  {
    id: "LOST",
    label: CRM_STAGE_LABELS.LOST,
    description: "Oportunidade encerrada sem conversao.",
    active: false,
  },
] as const;
const STAGE_SELECT_OPTIONS: Array<{ value: CrmLeadStage; label: string }> = [
  { value: "LEAD", label: "Lead" },
  { value: "SQL", label: "Validacao" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "NEGOTIATION", label: "Negociacao" },
  { value: "WON", label: CRM_STAGE_LABELS.WON },
  { value: "LOST", label: CRM_STAGE_LABELS.LOST },
];

function getPipelineStageLabel(stage: CrmLeadStage) {
  if (stage === "MQL" || stage === "SQL") return "Validacao";
  return CRM_STAGE_LABELS[stage];
}

function normalizeStageForSelect(stage: CrmLeadStage) {
  return stage === "MQL" ? "SQL" : stage;
}

function resolveLeadContactName(lead: CrmLead) {
  const primaryManualContact = lead.contacts.find((contact) => contact.isPrimary)?.name?.trim();
  const firstManualContact = lead.contacts.find((contact) => contact.name.trim())?.name.trim();
  return lead.primaryContactName || primaryManualContact || firstManualContact || "Sem contato vinculado";
}

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getLeadAttentionState(lead: CrmLead) {
  const today = getStartOfToday();
  const expectedCloseAt = lead.expectedCloseAt ? new Date(lead.expectedCloseAt) : null;
  const updatedAt = new Date(lead.updatedAt);
  const daysWithoutUpdate = Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
  const expectedDiffDays = expectedCloseAt ? Math.ceil((expectedCloseAt.getTime() - today.getTime()) / 86400000) : null;

  return {
    isClosed: lead.stage === "WON" || lead.stage === "LOST",
    isOverdue: Boolean(expectedCloseAt && expectedCloseAt < today && lead.stage !== "WON" && lead.stage !== "LOST"),
    isDueSoon: Boolean(
      expectedDiffDays !== null &&
      expectedDiffDays >= 0 &&
      expectedDiffDays <= DUE_SOON_DAYS &&
      lead.stage !== "WON" &&
      lead.stage !== "LOST",
    ),
    hasNextStep: Boolean(lead.nextStep?.trim()),
    isStale: daysWithoutUpdate >= STALE_LEAD_DAYS && lead.stage !== "WON" && lead.stage !== "LOST",
    daysWithoutUpdate,
    expectedDiffDays,
  };
}

function matchesAttentionFilter(lead: CrmLead, filter: LeadAttentionFilter) {
  const state = getLeadAttentionState(lead);
  if (filter === "OVERDUE") return state.isOverdue;
  if (filter === "NO_NEXT_STEP") return !state.hasNextStep && !state.isClosed;
  if (filter === "DUE_SOON") return state.isDueSoon;
  return true;
}

function sortLeadsForBoard(leads: CrmLead[]) {
  return [...leads].sort((a, b) => {
    const aAttention = getLeadAttentionState(a);
    const bAttention = getLeadAttentionState(b);

    const aScore = Number(aAttention.isOverdue) * 4 + Number(!aAttention.hasNextStep) * 3 + Number(aAttention.isDueSoon) * 2 + Number(aAttention.isStale);
    const bScore = Number(bAttention.isOverdue) * 4 + Number(!bAttention.hasNextStep) * 3 + Number(bAttention.isDueSoon) * 2 + Number(bAttention.isStale);
    if (aScore !== bScore) return bScore - aScore;

    const aDate = a.expectedCloseAt ? new Date(a.expectedCloseAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.expectedCloseAt ? new Date(b.expectedCloseAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDate !== bDate) return aDate - bDate;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
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

function getPipelineColumnLeads(
  grouped: ReturnType<typeof groupLeadsByStageLocal>,
  column: (typeof PIPELINE_COLUMNS)[number],
) {
  return column.stages.flatMap((stage) => grouped[stage]);
}

export function LeadManagementPage({ data }: { data: LeadDashboardData }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [leads, setLeads] = useState<CrmLead[]>(data.leads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("ACTIVE");
  const [attentionFilter, setAttentionFilter] = useState<LeadAttentionFilter>("ALL");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<CrmLeadStage | null>(null);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [isStageGuideOpen, setIsStageGuideOpen] = useState(false);

  useEffect(() => {
    setLeads(data.leads);
  }, [data.leads]);

  const grouped = useMemo(() => groupLeadsByStageLocal(leads), [leads]);
  const activeLeads = useMemo(() => leads.filter((lead) => !["WON", "LOST"].includes(lead.stage)), [leads]);
  const validationCount = grouped.MQL.length + grouped.SQL.length;

  const normalizedSearch = search.trim().toLowerCase();
  const searchedLeads = useMemo(
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

  const filteredLeads = useMemo(
    () => searchedLeads.filter((lead) => matchesAttentionFilter(lead, attentionFilter)),
    [searchedLeads, attentionFilter],
  );

  const filteredGrouped = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(groupLeadsByStageLocal(filteredLeads)).map(([stage, stageLeads]) => [stage, sortLeadsForBoard(stageLeads)]),
      ) as ReturnType<typeof groupLeadsByStageLocal>,
    [filteredLeads],
  );
  const closedFilteredLeads = useMemo(() => {
    if (statusFilter === "WON") return filteredLeads.filter((lead) => lead.stage === "WON");
    return filteredLeads.filter((lead) => lead.stage === "LOST");
  }, [filteredLeads, statusFilter]);

  const stageSummaryFilters = [
    { value: "ACTIVE" as const, label: "Todos", count: activeLeads.length },
    { value: "WON" as const, label: "Ganhos", count: grouped.WON.length },
    { value: "LOST" as const, label: "Perdidos", count: grouped.LOST.length },
  ];
  const attentionSummaryFilters = [
    { value: "ALL" as const, label: "Todos", count: searchedLeads.length },
    { value: "OVERDUE" as const, label: "Atrasados", count: searchedLeads.filter((lead) => getLeadAttentionState(lead).isOverdue).length },
    { value: "NO_NEXT_STEP" as const, label: "Sem proximo passo", count: searchedLeads.filter((lead) => !getLeadAttentionState(lead).hasNextStep && !getLeadAttentionState(lead).isClosed).length },
    { value: "DUE_SOON" as const, label: "Fechando em breve", count: searchedLeads.filter((lead) => getLeadAttentionState(lead).isDueSoon).length },
  ];
  const paginationSummary =
    data.pagination && data.pagination.total > data.leads.length
      ? `Exibindo ${data.leads.length} de ${data.pagination.total} leads`
      : data.pagination
        ? `${data.pagination.total} leads`
        : `${filteredLeads.length} leads`;

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
        successMessage: `Lead movido para ${getPipelineStageLabel(nextStage)}.`,
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <CompactMetricCard title="Leads ativos" value={activeLeads.length} icon={Target} tone="info" />
          <CompactMetricCard title="Validacao" value={validationCount} icon={KanbanSquare} tone="warning" />
          <CompactMetricCard title="Proposta" value={grouped.PROPOSAL.length} icon={PencilLine} tone="success" />
          <CompactMetricCard title="Negociacao" value={grouped.NEGOTIATION.length} icon={BadgeCheck} tone="neutral" />
        </div>

        <RegistryToolbar
          searchValue={search}
          searchPlaceholder="Buscar empresa, titulo, contato ou proximo passo..."
          onSearchChange={setSearch}
          onClearSearch={() => setSearch("")}
          resultLabel={paginationSummary}
          filters={
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
              <RegistryFilterGroup value={statusFilter} onChange={setStatusFilter} options={stageSummaryFilters} />
              <RegistryFilterGroup value={attentionFilter} onChange={setAttentionFilter} options={attentionSummaryFilters} />
            </div>
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
          <CardContent className="pt-6">
            {leads.length === 0 ? (
              <EmptyPipelineState />
            ) : statusFilter === "ACTIVE" ? (
              <div className="space-y-4">
                {filteredLeads.filter((lead) => CRM_ACTIVE_STAGE_ORDER.includes(lead.stage)).length === 0 ? (
                  <FilteredEmptyState search={search} statusLabel="pipeline ativo" />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                    {PIPELINE_COLUMNS.map((column) => {
                      const stageLeads = getPipelineColumnLeads(filteredGrouped, column);
                      return (
                        <section
                          key={column.id}
                          className={cn(
                            "min-w-0 rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors",
                            hoveredStage === column.dropStage && "border-primary/50 bg-primary/5",
                          )}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (draggedLeadId) setHoveredStage(column.dropStage);
                          }}
                          onDragLeave={() => setHoveredStage((current) => (current === column.dropStage ? null : current))}
                          onDrop={async (event) => {
                            event.preventDefault();
                            await handleDrop(column.dropStage);
                          }}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{column.label}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">{column.description}</p>
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
            {STAGE_GUIDE_ITEMS.map((stage) => (
              <div key={stage.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                  <Badge variant={stage.active ? "secondary" : "outline"}>
                    {stage.active ? "Etapa ativa" : "Resultado"}
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

function CompactMetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  icon: typeof Target;
  tone: "info" | "success" | "neutral" | "warning";
}) {
  const toneClass = {
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  }[tone];

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
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
  const attention = getLeadAttentionState(lead);

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

      <div className="mt-3 flex flex-wrap gap-1.5">
        {attention.isOverdue ? <LeadSignal tone="red" text="Fechamento atrasado" /> : null}
        {attention.isDueSoon ? <LeadSignal tone="amber" text="Fechando em breve" /> : null}
        {!attention.hasNextStep ? <LeadSignal tone="violet" text="Sem proximo passo" /> : null}
        {attention.isStale ? <LeadSignal tone="slate" text={`${attention.daysWithoutUpdate}d sem atualizacao`} /> : null}
      </div>

      <div className="mt-4 grid gap-2">
        <Select value={normalizeStageForSelect(lead.stage)} onValueChange={(value) => onStageChange(value as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger>
            <SelectValue placeholder="Mover etapa" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_SELECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
        <Select value={normalizeStageForSelect(lead.stage)} onValueChange={(value) => onStageChange(value as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_SELECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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

function LeadSignal({
  tone,
  text,
}: {
  tone: "red" | "amber" | "violet" | "slate";
  text: string;
}) {
  const toneClass = {
    red: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    slate: "border-border/60 bg-muted/40 text-muted-foreground",
  }[tone];

  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-medium", toneClass)}>{text}</span>;
}
