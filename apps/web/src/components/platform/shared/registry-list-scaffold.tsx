"use client";

import type { ElementType, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, X, type LucideIcon } from "lucide-react";

import { Button, Card, CardContent, Input } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

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

export function RegistryMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone: "info" | "success" | "neutral" | "warning";
}) {
  const toneClass = {
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  }[tone];

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RegistryToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onClearSearch,
  filters,
  actions,
  resultLabel,
}: {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
  filters?: ReactNode;
  actions?: ReactNode;
  resultLabel?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="group relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder={searchPlaceholder}
              className="h-9 rounded-md border-border/60 bg-background pl-10 pr-9 text-sm focus-visible:ring-primary/20"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {searchValue ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
                onClick={onClearSearch ?? (() => onSearchChange(""))}
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {filters ? <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{filters}</div> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          {resultLabel ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:mr-1">
              <Search className="h-3.5 w-3.5" />
              {resultLabel}
            </span>
          ) : null}
          {actions}
        </div>
      </div>
    </section>
  );
}

export function RegistryFilterGroup<TValue extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: TValue; label: string; count?: number }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-max items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              value === option.value
                ? "border border-border/50 bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className="ml-1.5 text-[10px] text-muted-foreground">{option.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RegistryTableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-background/50 shadow-lg backdrop-blur-xl">
      <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
      {children}
    </Card>
  );
}

export function RegistryEmptyState({
  icon: Icon,
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
    <div className={cn("flex flex-col items-center justify-center text-center text-muted-foreground", compact ? "gap-3" : "gap-3 p-8")}>
      <div className="rounded-full bg-muted/40 p-4">
        <Icon className="h-8 w-8 opacity-40" />
      </div>
      <div>
        <p className="font-medium text-foreground">{searchTerm ? `Sem resultados para "${searchTerm}"` : title}</p>
        <p className="mt-1 text-xs">{description}</p>
      </div>
      {searchTerm && onClear ? (
        <Button variant="outline" size="sm" className="mt-1 gap-1.5 text-xs" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
          Limpar busca
        </Button>
      ) : null}
    </div>
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
