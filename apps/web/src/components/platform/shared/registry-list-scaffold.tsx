"use client";

import type { ElementType, ReactNode } from "react";
import { ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react";

import { Button, Card } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  PortalTable,
  PortalTableBody,
  PortalTableEmptyRow,
  PortalTableHeader,
  PortalTableLoadingRow,
  PortalTableViewport,
  SearchToolbar,
  FilterTabs,
} from "@/components/patterns";

export function RegistryFeedback({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
      )}
    >
      {message}
    </div>
  );
}

export function RegistryMetrics({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-3">{children}</div>;
}

export { MetricCard as RegistryMetricCard } from "@/components/patterns";
export { SearchToolbar as RegistryToolbar } from "@/components/patterns";
export { FilterTabs as RegistryFilterGroup } from "@/components/patterns";

export function RegistryTableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-background/50 shadow-lg backdrop-blur-xl">
      <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
      {children}
    </Card>
  );
}

export function RegistryEmptyState({
  icon,
  title,
  description,
  searchTerm,
  onClear,
  compact = false,
}: {
  icon: ElementType;
  title: string;
  description: string;
  searchTerm?: string;
  onClear?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyState
      icon={icon}
      title={searchTerm ? `Sem resultados para "${searchTerm}"` : title}
      description={description}
      compact={compact}
      action={searchTerm && onClear ? { label: "Limpar busca", onClick: onClear } : undefined}
    />
  );
}

export function RegistryFooter({
  filtered,
  total,
  singular,
  plural,
  searchTerm,
  onClearSearch,
  right,
}: {
  filtered: number;
  total: number;
  singular: string;
  plural: string;
  searchTerm?: string;
  onClearSearch?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Exibindo <span className="font-medium tabular-nums text-foreground">{filtered}</span> de{" "}
        <span className="font-medium tabular-nums text-foreground">{total}</span> {total === 1 ? singular : plural}
      </span>
      {right ?? (
        searchTerm && onClearSearch ? (
          <button type="button" onClick={onClearSearch} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-3 w-3" />
            Limpar busca
          </button>
        ) : null
      )}
    </div>
  );
}

export type RegistryPaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
};

type RegistryEmptyStateConfig = {
  icon: ElementType;
  title: string;
  description: string;
  searchTerm?: string;
  onClear?: () => void;
};

type RegistryPaginationConfig = {
  pagination: RegistryPaginationState;
  itemLabel: { singular: string; plural: string };
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  footer?: ReactNode;
};

function getRegistryEmptyTitle(config: RegistryEmptyStateConfig) {
  return config.searchTerm ? `Sem resultados para "${config.searchTerm}"` : config.title;
}

export function RegistryDataTable({
  toolbar,
  content,
  mobileContent,
  desktopHeader,
  desktopContent,
  loading = false,
  loadingLabel = "Carregando...",
  isEmpty,
  emptyState,
  desktopColSpan,
  minWidthClassName,
  pagination,
  className,
  cardClassName,
  mobileClassName,
  desktopClassName,
  desktopHeaderClassName,
  wrapInCard = true,
  flexible = false,
}: {
  toolbar?: ReactNode;
  content?: ReactNode;
  mobileContent?: ReactNode;
  desktopHeader?: ReactNode;
  desktopContent?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  isEmpty: boolean;
  emptyState: RegistryEmptyStateConfig;
  desktopColSpan: number;
  minWidthClassName?: string;
  pagination?: RegistryPaginationConfig;
  className?: string;
  cardClassName?: string;
  mobileClassName?: string;
  desktopClassName?: string;
  desktopHeaderClassName?: string;
  wrapInCard?: boolean;
  flexible?: boolean;
}) {
  const emptyTitle = getRegistryEmptyTitle(emptyState);
  const body = content ? (
    loading ? (
      <LoadingState label={loadingLabel} compact={false} className="p-6" />
    ) : isEmpty ? (
      <RegistryEmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        searchTerm={emptyState.searchTerm}
        onClear={emptyState.onClear}
      />
    ) : (
      content
    )
  ) : (
    <>
      <div className={cn("divide-y divide-border/60 md:hidden", mobileClassName)}>
        {loading ? (
          <LoadingState label={loadingLabel} compact={false} className="p-6" />
        ) : isEmpty ? (
          <RegistryEmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            searchTerm={emptyState.searchTerm}
            onClear={emptyState.onClear}
          />
        ) : (
          mobileContent
        )}
      </div>

      <PortalTableViewport className={cn("hidden md:block", desktopClassName)} minWidthClassName={minWidthClassName} flexible={flexible}>
        <PortalTable>
          <PortalTableHeader className={desktopHeaderClassName}>{desktopHeader}</PortalTableHeader>
          <PortalTableBody>
            {loading ? (
              <PortalTableLoadingRow colSpan={desktopColSpan} label={loadingLabel} />
            ) : isEmpty ? (
              <PortalTableEmptyRow
                colSpan={desktopColSpan}
                icon={emptyState.icon as LucideIcon}
                title={emptyTitle}
                description={emptyState.description}
              />
            ) : (
              desktopContent
            )}
          </PortalTableBody>
        </PortalTable>
      </PortalTableViewport>
    </>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar}

      {wrapInCard ? <RegistryTableCard>{body}</RegistryTableCard> : body}

      {pagination ? (
        <div className={cn("flex flex-col gap-2", cardClassName)}>
          <RegistryPagination
            pagination={pagination.pagination}
            itemLabel={pagination.itemLabel}
            isLoading={pagination.isLoading}
            onPageChange={pagination.onPageChange}
          />
          {pagination.footer}
        </div>
      ) : null}
    </div>
  );
}

export function RegistryPagination({
  pagination,
  itemLabel,
  isLoading = false,
  onPageChange,
}: {
  pagination: RegistryPaginationState;
  itemLabel: { singular: string; plural: string };
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = pagination.totalPages ?? Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const hasPreviousPage = pagination.hasPreviousPage ?? pagination.page > 1;
  const hasNextPage = pagination.hasNextPage ?? pagination.page < totalPages;
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="flex flex-col gap-2 px-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Exibindo{" "}
        <span className="font-medium tabular-nums text-foreground">{start}</span>
        {" - "}
        <span className="font-medium tabular-nums text-foreground">{end}</span>
        {" de "}
        <span className="font-medium tabular-nums text-foreground">{pagination.total}</span>{" "}
        {pagination.total === 1 ? itemLabel.singular : itemLabel.plural}
      </span>

      <div className="flex items-center gap-2">
        <span className="mr-1 text-xs">
          Pagina <span className="tabular-nums">{pagination.page}</span> de{" "}
          <span className="tabular-nums">{totalPages}</span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={isLoading || !hasPreviousPage}
          aria-label="Pagina anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={isLoading || !hasNextPage}
          aria-label="Proxima pagina"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
