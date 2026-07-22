"use client";

import type { DragEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@dosc-syspro/ui";
import { ArrowRight, Info, KanbanSquare, CheckCircle2, XCircle } from "lucide-react";
import type { CrmLead, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import type { LeadDashboardData } from "@/features/crm/domain/crm.types";
import { formatLeadCurrency } from "@/features/crm/domain/crm.types";
import { formatNumber } from "@/lib/formatters";
import { RegistryDataTable, RegistryFilterGroup, RegistryToolbar } from "@/components/platform/shared/registry-list-scaffold";
import { PageHeader } from "@/components/patterns";
import { DashboardMetricCard } from "@/features/dashboard/interface/components/dashboard-metric-card";
import { trpc } from "@/lib/api/trpc-client";
import { useLeadFilters } from "./lead-management/hooks/use-lead-filters";
import { useLeadDetails } from "./lead-management/hooks/use-lead-details";
import { getPipelineStageLabel } from "./lead-management/lead-management.helpers";
import { LeadBoardSection } from "./lead-management/components/lead-board-section";
import { LeadDetailsSheet } from "./lead-management/components/lead-details-sheet";
import { LeadStageGuideDialog } from "./lead-management/components/lead-stage-guide-dialog";
import type { LeadAttentionFilter, LeadStatusFilter } from "./lead-management/lead-management.types";
import { cn } from "@/lib/utils";

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

  useEffect(() => { setLeads(data.leads); }, [data.leads]);

  const {
    filteredGrouped,
    closedFilteredLeads,
    stageSummaryFilters,
    attentionSummaryFilters,
    paginationSummary,
    hasActiveLeadsInFilter,
    conversionRate,
    weightedPipelineValue,
    overdueCount,
    noNextStepCount,
  } = useLeadFilters(leads, search, statusFilter, attentionFilter, data.pagination);

  const details = useLeadDetails({ setLeads, router, startTransition });

  async function persistLeadUpdate(
    leadId: string,
    payload: Record<string, unknown>,
    options?: { successMessage?: string; optimisticLead?: CrmLead },
  ) {
    if (!Object.keys(payload).length) { toast.info("Nenhuma alteracao para salvar."); return; }
    const previousLeads = leads;
    setSavingLeadId(leadId);
    if (options?.optimisticLead) {
      setLeads((current) => current.map((l) => (l.id === leadId ? options.optimisticLead ?? l : l)));
    }
    try {
      const result = await trpc.crm.update.mutate({ id: leadId, data: payload });
      if (!result?.success || !result?.data) {
        setLeads(previousLeads);
        toast.error(result?.message || "Falha ao atualizar lead.");
        return;
      }
      const updated = result.data as CrmLead;
      setLeads((current) => current.map((l) => (l.id === leadId ? updated : l)));
      details.syncIfOpen(leadId, updated);
      if (options?.successMessage) toast.success(options.successMessage);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      toast.error("Falha ao atualizar lead.");
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handleStageChange(lead: CrmLead, nextStage: CrmLeadStage) {
    if (lead.stage === nextStage || savingLeadId) return;
    if (nextStage === "LOST" && !(lead.lostReason ?? "").trim()) {
      details.setSelectedLeadId(lead.id);
      toast.info("Informe o motivo da perda para encerrar o lead.");
      return;
    }
    await persistLeadUpdate(lead.id, { stage: nextStage }, {
      successMessage: `Lead movido para ${getPipelineStageLabel(nextStage)}.`,
      optimisticLead: { ...lead, stage: nextStage },
    });
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
    const draggedLead = leads.find((l) => l.id === draggedLeadId);
    setHoveredStage(null);
    setDraggedLeadId(null);
    if (draggedLead) await handleStageChange(draggedLead, stage);
  }

  return (
    <>
      <div className="space-y-5 pb-20">
        <PageHeader
          title="Leads"
          description="Gerencie o pipeline comercial, acompanhe proximos passos e mova oportunidades entre etapas."
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

        {/* Top KPIs Metric Panel */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={cn(
              "cursor-pointer transition-all hover:translate-y-[-2px]",
              attentionFilter === "ALL" && statusFilter === "ACTIVE" && "ring-2 ring-primary ring-offset-2 rounded-lg"
            )}
            onClick={() => {
              setAttentionFilter("ALL");
              setStatusFilter("ACTIVE");
            }}
          >
            <DashboardMetricCard
              title="Pipeline Ponderado"
              value={formatLeadCurrency(weightedPipelineValue)}
              helper={`${leads.filter(l => !["WON", "LOST"].includes(l.stage)).length} leads ativos no funil`}
              icon="dollar"
              tone="blue"
            />
          </div>

          <div
            className={cn(
              "cursor-pointer transition-all hover:translate-y-[-2px]",
              attentionFilter === "OVERDUE" && "ring-2 ring-red-500 ring-offset-2 rounded-lg"
            )}
            onClick={() => {
              setAttentionFilter("OVERDUE");
              setStatusFilter("ACTIVE");
            }}
          >
            <DashboardMetricCard
              title="Leads Atrasados"
              value={overdueCount}
              helper="Fechamento expirado"
              icon="alertTriangle"
              tone={overdueCount > 0 ? "red" : "blue"}
            />
          </div>

          <div
            className={cn(
              "cursor-pointer transition-all hover:translate-y-[-2px]",
              attentionFilter === "NO_NEXT_STEP" && "ring-2 ring-amber-500 ring-offset-2 rounded-lg"
            )}
            onClick={() => {
              setAttentionFilter("NO_NEXT_STEP");
              setStatusFilter("ACTIVE");
            }}
          >
            <DashboardMetricCard
              title="Sem Próxima Ação"
              value={noNextStepCount}
              helper="Sem tarefa agendada"
              icon="clock"
              tone={noNextStepCount > 0 ? "amber" : "blue"}
            />
          </div>

          <div
            className={cn(
              "cursor-pointer transition-all hover:translate-y-[-2px]",
              statusFilter !== "ACTIVE" && "ring-2 ring-emerald-500 ring-offset-2 rounded-lg"
            )}
            onClick={() => {
              if (statusFilter === "ACTIVE") {
                setStatusFilter("WON");
              } else {
                setStatusFilter("ACTIVE");
              }
            }}
          >
            <DashboardMetricCard
              title="Taxa de Conversão"
              value={`${formatNumber(conversionRate, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              helper={`${leads.filter(l => l.stage === "WON").length} ganhos | ${leads.filter(l => l.stage === "LOST").length} perdidos`}
              icon="sparkles"
              tone="emerald"
            />
          </div>
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
        />

        <RegistryDataTable
          isEmpty={false}
          emptyState={{
            icon: KanbanSquare,
            title: "Nenhum lead encontrado",
            description: "Ajuste os filtros para exibir outros leads.",
          }}
          desktopColSpan={1}
          content={
            <LeadBoardSection
              leads={leads}
              search={search}
              statusFilter={statusFilter}
              filteredGrouped={filteredGrouped}
              closedFilteredLeads={closedFilteredLeads}
              hasActiveLeadsInFilter={hasActiveLeadsInFilter}
              draggedLeadId={draggedLeadId}
              hoveredStage={hoveredStage}
              savingLeadId={savingLeadId}
              isRefreshing={isRefreshing}
              onEdit={details.setSelectedLeadId}
              onStageChange={handleStageChange}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(stage) => { if (draggedLeadId) setHoveredStage(stage); }}
              onDragLeave={(stage) => setHoveredStage((current) => (current === stage ? null : current))}
              onDrop={handleDrop}
            />
          }
        />
      </div>

      {/* Dynamic Bottom Drop Zones for Won and Lost leads */}
      {draggedLeadId && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-border/80 bg-background/95 p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (hoveredStage !== "WON") setHoveredStage("WON");
            }}
            onDragLeave={() => setHoveredStage(null)}
            onDrop={async (e) => {
              e.preventDefault();
              await handleDrop("WON");
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border border-dashed px-6 py-3 text-xs font-semibold transition-colors cursor-pointer select-none",
              hoveredStage === "WON"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-emerald-500/30 text-emerald-500"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Marcar como Ganho
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (hoveredStage !== "LOST") setHoveredStage("LOST");
            }}
            onDragLeave={() => setHoveredStage(null)}
            onDrop={async (e) => {
              e.preventDefault();
              await handleDrop("LOST");
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border border-dashed px-6 py-3 text-xs font-semibold transition-colors cursor-pointer select-none",
              hoveredStage === "LOST"
                ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-rose-500/30 text-rose-500"
            )}
          >
            <XCircle className="h-4 w-4" />
            Marcar como Perdido
          </div>
        </div>
      )}

      <LeadDetailsSheet
        open={!!details.selectedLeadId}
        onClose={() => details.setSelectedLeadId(null)}
        leadDetails={details.leadDetails}
        isLoadingDetails={details.isLoadingDetails}
        activities={details.activities}
        tasks={details.tasks}
        editForm={details.editForm}
        updateEditField={details.updateEditField}
        isSavingForm={details.isSavingForm}
        isLookupLoading={details.isLookupLoading}
        onSaveForm={details.handleSaveForm}
        onLookupCnpj={details.handleLookupCnpj}
        editingContactIndex={details.editingContactIndex}
        editingContact={details.editingContact}
        setEditingContactIndex={details.setEditingContactIndex}
        setEditingContact={details.setEditingContact}
        onSaveContact={details.handleSaveContact}
        onRemoveContact={details.handleRemoveContact}
        newActivityBody={details.newActivityBody}
        setNewActivityBody={details.setNewActivityBody}
        newActivityType={details.newActivityType}
        setNewActivityType={details.setNewActivityType}
        isPostingActivity={details.isPostingActivity}
        onAddActivity={details.handleAddActivity}
        newTaskTitle={details.newTaskTitle}
        setNewTaskTitle={details.setNewTaskTitle}
        newTaskDueDate={details.newTaskDueDate}
        setNewTaskDueDate={details.setNewTaskDueDate}
        isCreatingTask={details.isCreatingTask}
        onCreateTask={details.handleCreateTask}
        onToggleTaskStatus={details.handleToggleTaskStatus}
        onDeleteTask={details.handleDeleteTask}
      />

      <LeadStageGuideDialog open={isStageGuideOpen} onOpenChange={setIsStageGuideOpen} />
    </>
  );
}
