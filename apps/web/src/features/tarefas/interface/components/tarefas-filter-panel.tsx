"use client";

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dosc-syspro/ui";
import type { TaskItemListResponse } from "@dosc-syspro/contracts/tarefas";
import {
  ADVANCED_STATUS_FILTER_OPTIONS,
  ORIGIN_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
} from "./tarefas-page.constants";

interface TarefasFilterPanelProps {
  type: string;
  origin: string;
  status: string;
  dueFrom: string;
  dueTo: string;
  shouldUseCompetenceFilter: boolean;
  shouldUseOperationalDueFilter: boolean;
  currentMonthValue: string;
  competenceLabel: string | null;
  tasksSummary: TaskItemListResponse["summary"];
  setTypeFilter: (value: string) => void;
  setOriginFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setCompetenceFilter: (value: string) => void;
  setDueDateFilter: (key: "dueFrom" | "dueTo", value: string) => void;
}

export function TarefasFilterPanel({
  type,
  origin,
  status,
  dueFrom,
  dueTo,
  shouldUseCompetenceFilter,
  shouldUseOperationalDueFilter,
  currentMonthValue,
  competenceLabel,
  tasksSummary,
  setTypeFilter,
  setOriginFilter,
  setStatusFilter,
  setCompetenceFilter,
  setDueDateFilter,
}: TarefasFilterPanelProps) {
  return (
    <div className="rounded-lg border border-border/40 bg-background p-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,15rem)_minmax(0,15rem)_minmax(0,15rem)_minmax(0,15rem)]">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Recorte</p>
          <Select value={type || "ALL"} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Origem</p>
          <Select value={origin || "ALL"} onValueChange={setOriginFilter}>
            <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
              <SelectValue placeholder="Todas as origens" />
            </SelectTrigger>
            <SelectContent>
              {ORIGIN_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
          <Select value={status || "OPEN"} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
              <SelectValue placeholder="Em aberto" />
            </SelectTrigger>
            <SelectContent>
              {ADVANCED_STATUS_FILTER_OPTIONS.map((option) => {
                const count =
                  option.countKey === "total"
                    ? tasksSummary.total
                    : tasksSummary[option.countKey as keyof typeof tasksSummary];
                return (
                  <SelectItem key={option.value} value={option.value}>
                    {count == null ? option.label : `${option.label} (${count})`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            {shouldUseCompetenceFilter ? "Competência mensal" : "Vencimento inicial"}
          </p>
          {shouldUseCompetenceFilter ? (
            <Input
              type="month"
              value={currentMonthValue}
              onChange={(event) => setCompetenceFilter(event.target.value)}
              className="h-9 border-border/60 bg-background text-sm"
            />
          ) : (
            <Input
              type="date"
              value={dueFrom}
              onChange={(event) => setDueDateFilter("dueFrom", event.target.value)}
              className="h-9 border-border/60 bg-background text-sm"
            />
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            {shouldUseCompetenceFilter ? "Competência aplicada" : "Vencimento final"}
          </p>
          {shouldUseCompetenceFilter ? (
            <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-muted-foreground">
              {competenceLabel ? `Rotinas em ${competenceLabel}` : "Sem competência ativa"}
            </div>
          ) : (
            <Input
              type="date"
              value={dueTo}
              onChange={(event) => setDueDateFilter("dueTo", event.target.value)}
              className="h-9 border-border/60 bg-background text-sm"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            Periodo operacional
          </p>
          <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-muted-foreground">
            {!shouldUseOperationalDueFilter
              ? "Rotinas usam competência mensal"
              : dueFrom || dueTo
                ? `Vencimento ${dueFrom || "..."} até ${dueTo || "..."}`
                : "Sem intervalo de vencimento aplicado"}
          </div>
        </div>
      </div>
    </div>
  );
}
