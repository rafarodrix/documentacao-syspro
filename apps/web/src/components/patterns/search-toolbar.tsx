"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

interface SearchToolbarProps {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
  filters?: ReactNode;
  actions?: ReactNode;
  resultLabel?: ReactNode;
  className?: string;
}

export function SearchToolbar({
  searchValue,
  searchPlaceholder = "Buscar...",
  onSearchChange,
  onClearSearch,
  filters,
  actions,
  resultLabel,
  className,
}: SearchToolbarProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="group relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder={searchPlaceholder}
              className="h-9 rounded-md border-border/60 bg-background pl-10 pr-9 text-sm focus-visible:ring-primary/20"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
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
          {filters ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {filters}
            </div>
          ) : null}
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
