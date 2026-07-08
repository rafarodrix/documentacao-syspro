import { useMemo } from "react";
import type { CrmLead } from "@dosc-syspro/contracts/crm";
import { CRM_ACTIVE_STAGE_ORDER } from "@/features/crm/domain/crm.types";
import type { LeadDashboardData } from "@/features/crm/domain/crm.types";
import {
  getLeadAttentionState,
  groupLeadsByStageLocal,
  matchesAttentionFilter,
  sortLeadsForBoard,
} from "../lead-management.helpers";
import type { LeadAttentionFilter, LeadStatusFilter } from "../lead-management.types";

export function useLeadFilters(
  leads: CrmLead[],
  search: string,
  statusFilter: LeadStatusFilter,
  attentionFilter: LeadAttentionFilter,
  pagination: LeadDashboardData["pagination"],
) {
  const grouped = useMemo(() => groupLeadsByStageLocal(leads), [leads]);
  const activeLeads = useMemo(() => leads.filter((l) => !["WON", "LOST"].includes(l.stage)), [leads]);
  const validationCount = grouped.MQL.length + grouped.SQL.length;

  const normalizedSearch = search.trim().toLowerCase();

  const searchedLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (!normalizedSearch) return true;
        return [lead.companyName, lead.title, lead.primaryContactName, lead.ownerName, lead.nextStep, lead.lostReason]
          .filter(Boolean)
          .some((v) => v?.toLowerCase().includes(normalizedSearch));
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
        Object.entries(groupLeadsByStageLocal(filteredLeads)).map(([stage, stageLeads]) => [
          stage,
          sortLeadsForBoard(stageLeads),
        ]),
      ) as ReturnType<typeof groupLeadsByStageLocal>,
    [filteredLeads],
  );

  const closedFilteredLeads = useMemo(() => {
    if (statusFilter === "WON") return filteredLeads.filter((l) => l.stage === "WON");
    return filteredLeads.filter((l) => l.stage === "LOST");
  }, [filteredLeads, statusFilter]);

  const stageSummaryFilters = [
    { value: "ACTIVE" as const, label: "Todos", count: activeLeads.length },
    { value: "WON" as const, label: "Ganhos", count: grouped.WON.length },
    { value: "LOST" as const, label: "Perdidos", count: grouped.LOST.length },
  ];

  const attentionSummaryFilters = [
    { value: "ALL" as const, label: "Todos", count: searchedLeads.length },
    {
      value: "OVERDUE" as const,
      label: "Atrasados",
      count: searchedLeads.filter((l) => getLeadAttentionState(l).isOverdue).length,
    },
    {
      value: "NO_NEXT_STEP" as const,
      label: "Sem proximo passo",
      count: searchedLeads.filter((l) => !getLeadAttentionState(l).hasNextStep && !getLeadAttentionState(l).isClosed).length,
    },
    {
      value: "DUE_SOON" as const,
      label: "Fechando em breve",
      count: searchedLeads.filter((l) => getLeadAttentionState(l).isDueSoon).length,
    },
  ];

  const totalLeads = leads.length;
  const paginationSummary =
    pagination && pagination.total > totalLeads
      ? `Exibindo ${totalLeads} de ${pagination.total} leads`
      : pagination
        ? `${pagination.total} leads`
        : `${filteredLeads.length} leads`;

  const hasActiveLeadsInFilter =
    filteredLeads.filter((l) => CRM_ACTIVE_STAGE_ORDER.includes(l.stage)).length > 0;

  const wonCount = grouped.WON.length;
  const lostCount = grouped.LOST.length;
  const totalClosed = wonCount + lostCount;
  const conversionRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;

  const stageProbabilities: Record<string, number> = {
    LEAD: 0.1,
    MQL: 0.2,
    SQL: 0.35,
    PROPOSAL: 0.6,
    NEGOTIATION: 0.8,
    WON: 1.0,
    LOST: 0.0,
  };

  const weightedPipelineValue = activeLeads.reduce((sum, lead) => {
    const prob = stageProbabilities[lead.stage] ?? 0.1;
    return sum + (lead.estimatedValue ?? 0) * prob;
  }, 0);

  const overdueCount = activeLeads.filter((l) => getLeadAttentionState(l).isOverdue).length;
  const noNextStepCount = activeLeads.filter((l) => !getLeadAttentionState(l).hasNextStep).length;

  return {
    grouped,
    activeLeads,
    validationCount,
    searchedLeads,
    filteredLeads,
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
  };
}
