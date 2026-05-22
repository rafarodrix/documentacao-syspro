"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/patterns";
import {
  RegistryFilterGroup,
  RegistryToolbar,
  RegistryPagination,
} from "@/components/platform/shared/registry-list-scaffold";
import type { TaskItem, TaskItemListResponse } from "@dosc-syspro/contracts/tarefas";
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dosc-syspro/ui";
import { CircleAlert, Filter, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTarefasFilters } from "../hooks/use-tarefas-filters";
import { useTarefasColumns } from "../hooks/use-tarefas-columns";
import { TarefasFilterPanel } from "./tarefas-filter-panel";
import { TaskCreateDialog } from "./task-create-dialog";
import { TaskDetailsDialog } from "./task-details-dialog";
import { TaskManualRequestDialog } from "./task-manual-request-dialog";
import { TaskStatusDialog } from "./task-status-dialog";

interface TarefasPageProps {
  tasks: TaskItemListResponse;
  search: string;
  status: string;
  type: string;
  origin: string;
  year: string;
  month: string;
  dueFrom: string;
  dueTo: string;
  canManage: boolean;
}

export function TarefasPage({
  tasks,
  search,
  status,
  type,
  origin,
  year,
  month,
  dueFrom,
  dueTo,
  canManage,
}: TarefasPageProps) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedStatusTask, setSelectedStatusTask] = useState<TaskItem | null>(null);
  const [selectedDetailsTaskId, setSelectedDetailsTaskId] = useState<string | null>(null);
  const [selectedRowTaskId, setSelectedRowTaskId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    clientContactName: true,
    dueDate: true,
    requiredDocumentsCount: true,
    requests: true,
    status: true,
  });

  const filters = useTarefasFilters({
    search,
    status,
    type,
    origin,
    year,
    month,
    dueFrom,
    dueTo,
    tasks,
  });

  const { columns, renderMobileItem } = useTarefasColumns({
    canManage,
    setSelectedStatusTask,
    setSelectedTask,
  });

  useEffect(() => {
    if (!tasks.items.length) {
      setSelectedRowTaskId(null);
      return;
    }
    setSelectedRowTaskId((current) => {
      if (current && tasks.items.some((item) => item.id === current)) return current;
      return tasks.items[0]?.id ?? null;
    });
  }, [tasks.items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        description="Gerencie rotinas mensais por competencia e tarefas avulsas como backlog operacional continuo."
        actions={
          canManage ? (
            <>
              <Button
                type="button"
                onClick={() => setIsCreateDialogOpen(true)}
                className="h-10 w-full gap-2 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
              {!filters.isManualBacklogView ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={filters.handleSyncMonth}
                  disabled={filters.isSyncing}
                  className="h-10 w-full gap-2 sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${filters.isSyncing ? "animate-spin" : ""}`} />
                  {filters.isSyncing ? "Sincronizando..." : "Sincronizar rotinas do mes"}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      <RegistryToolbar
        searchValue={filters.searchDraft}
        searchPlaceholder="Buscar por empresa, tarefa, contato ou contador..."
        onSearchChange={filters.setSearchDraft}
        onClearSearch={() => filters.setSearchDraft("")}
        resultLabel={`${tasks.pagination.total} filtradas`}
        filters={
          <RegistryFilterGroup
            value={status || "OPEN"}
            onChange={filters.setStatusFilter}
            options={filters.statusFilterOptions}
          />
        }
        actions={
          <>
            {filters.hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
                onClick={filters.clearFilters}
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Limpar
              </Button>
            ) : null}
            <Button
              type="button"
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowFilters((current) => !current)}
              aria-label="Mostrar filtros"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {showFilters ? (
        <TarefasFilterPanel
          type={type}
          origin={origin}
          status={status}
          dueFrom={dueFrom}
          dueTo={dueTo}
          shouldUseCompetenceFilter={filters.shouldUseCompetenceFilter}
          shouldUseOperationalDueFilter={filters.shouldUseOperationalDueFilter}
          currentMonthValue={filters.currentMonthValue}
          competenceLabel={filters.competenceLabel}
          tasksSummary={tasks.summary}
          setTypeFilter={filters.setTypeFilter}
          setOriginFilter={filters.setOriginFilter}
          setStatusFilter={filters.setStatusFilter}
          setCompetenceFilter={filters.setCompetenceFilter}
          setDueDateFilter={filters.setDueDateFilter}
        />
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="text-xs text-muted-foreground font-medium">
            {tasks.pagination.total > 0 && (
              <span>
                Exibindo{" "}
                <span className="font-semibold text-foreground">
                  {(tasks.pagination.page - 1) * tasks.pagination.pageSize + 1}–
                  {Math.min(
                    tasks.pagination.page * tasks.pagination.pageSize,
                    tasks.pagination.total,
                  )}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">{tasks.pagination.total}</span>{" "}
                {tasks.pagination.total === 1 ? "tarefa" : "tarefas"}
              </span>
            )}
          </div>
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-border/60 bg-background/50 hover:bg-muted/50 text-xs shadow-sm transition-all duration-200"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                  <span>Colunas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 bg-card/95 backdrop-blur-md border border-border/40 shadow-xl animate-in fade-in duration-200"
              >
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5 py-1.5">
                  Exibir Colunas
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40 mx-1" />
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.clientContactName}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, clientContactName: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Contato cliente
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.dueDate}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, dueDate: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Vencimento
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.requiredDocumentsCount}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, requiredDocumentsCount: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Checklist
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.requests}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, requests: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Solicitações
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.status}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, status: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={tasks.items}
          loading={filters.isPending}
          loadingLabel="Carregando tarefas..."
          emptyState={{
            title: "Nenhuma tarefa encontrada",
            description: filters.hasActiveFilters
              ? "Ajuste os filtros para ampliar o recorte ou limpe a busca atual."
              : "Ative empresas na configuracao de rotina mensal ou crie tarefas avulsas para iniciar a fila.",
            icon: CircleAlert,
          }}
          flexible={true}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={(row) => setSelectedRowTaskId(row.id)}
          onRowDoubleClick={(row) => setSelectedDetailsTaskId(row.id)}
          rowClassName={(row) =>
            cn(
              "align-top cursor-pointer",
              selectedRowTaskId === row.id && "bg-primary/5 hover:bg-primary/10",
            )
          }
          renderMobileItem={renderMobileItem}
        />
      </div>

      {tasks.pagination.total > 0 && (
        <div className="mt-4">
          <RegistryPagination
            pagination={{
              page: tasks.pagination.page,
              pageSize: tasks.pagination.pageSize,
              total: tasks.pagination.total,
              hasPreviousPage: tasks.pagination.hasPreviousPage,
              hasNextPage: tasks.pagination.hasNextPage,
            }}
            itemLabel={{ singular: "tarefa", plural: "tarefas" }}
            isLoading={filters.isPending}
            onPageChange={filters.setPage}
          />
        </div>
      )}

      <TaskCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={() => router.refresh()}
      />

      <TaskManualRequestDialog
        item={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        onSent={() => router.refresh()}
      />

      <TaskStatusDialog
        item={selectedStatusTask}
        open={Boolean(selectedStatusTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedStatusTask(null);
        }}
        onSaved={() => router.refresh()}
      />

      <TaskDetailsDialog
        itemId={selectedDetailsTaskId}
        open={Boolean(selectedDetailsTaskId)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailsTaskId(null);
        }}
      />
    </div>
  );
}
