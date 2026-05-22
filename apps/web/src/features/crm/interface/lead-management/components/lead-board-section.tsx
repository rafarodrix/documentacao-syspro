"use client";

import type { DragEvent } from "react";
import { Badge, CardContent } from "@dosc-syspro/ui";
import type { CrmLead, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { cn } from "@/lib/utils";
import { getPipelineColumnLeads, groupLeadsByStageLocal } from "../lead-management.helpers";
import { PIPELINE_COLUMNS } from "../lead-management.constants";
import { LeadCard, ClosedLeadCard } from "./lead-card";
import { EmptyPipelineState, FilteredEmptyState } from "./lead-empty-states";

type Props = {
  leads: CrmLead[];
  search: string;
  statusFilter: "ACTIVE" | "WON" | "LOST";
  filteredGrouped: ReturnType<typeof groupLeadsByStageLocal>;
  closedFilteredLeads: CrmLead[];
  hasActiveLeadsInFilter: boolean;
  draggedLeadId: string | null;
  hoveredStage: CrmLeadStage | null;
  savingLeadId: string | null;
  isRefreshing: boolean;
  onEdit: (leadId: string) => void;
  onStageChange: (lead: CrmLead, nextStage: CrmLeadStage) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, leadId: string) => void;
  onDragEnd: () => void;
  onDragOver: (stage: CrmLeadStage) => void;
  onDragLeave: (stage: CrmLeadStage) => void;
  onDrop: (stage: CrmLeadStage) => void;
};

export function LeadBoardSection({
  leads,
  search,
  statusFilter,
  filteredGrouped,
  closedFilteredLeads,
  hasActiveLeadsInFilter,
  draggedLeadId,
  hoveredStage,
  savingLeadId,
  isRefreshing,
  onEdit,
  onStageChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  if (leads.length === 0) {
    return <CardContent className="pt-6"><EmptyPipelineState /></CardContent>;
  }

  if (statusFilter === "ACTIVE") {
    return (
      <CardContent className="pt-6">
        <div className="space-y-4">
          {!hasActiveLeadsInFilter ? (
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
                    onDragOver={(e) => { e.preventDefault(); if (draggedLeadId) onDragOver(column.dropStage); }}
                    onDragLeave={() => onDragLeave(column.dropStage)}
                    onDrop={async (e) => { e.preventDefault(); onDrop(column.dropStage); }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{column.label}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{column.description}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 rounded-full px-2.5">{stageLeads.length}</Badge>
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
                            onEdit={() => onEdit(lead.id)}
                            onStageChange={(nextStage) => onStageChange(lead, nextStage)}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
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
      </CardContent>
    );
  }

  if (closedFilteredLeads.length === 0) {
    return (
      <CardContent className="pt-6">
        <FilteredEmptyState
          search={search}
          statusLabel={statusFilter === "WON" ? "ganhos" : "perdidos"}
        />
      </CardContent>
    );
  }

  return (
    <CardContent className="pt-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {closedFilteredLeads.map((lead) => (
          <ClosedLeadCard
            key={lead.id}
            lead={lead}
            isSaving={savingLeadId === lead.id || isRefreshing}
            onEdit={() => onEdit(lead.id)}
            onStageChange={(nextStage) => onStageChange(lead, nextStage)}
          />
        ))}
      </div>
    </CardContent>
  );
}
