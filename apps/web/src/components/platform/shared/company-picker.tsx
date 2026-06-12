"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
  PlusCircle,
  Search,
  UserRound,
} from "lucide-react";

import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

export type CompanyPickerOption = {
  id: string;
  label: string;
  description?: string | null;
  meta?: string | null;
  kind?: "company" | "contact";
};

interface CompanyPickerProps {
  value: string;
  options: CompanyPickerOption[];
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_VISIBLE_OPTIONS = 50;
const SEARCH_DEBOUNCE_MS = 180;
const RESET_QUERY_DELAY_MS = 150;

export function CompanyPicker({
  value,
  options,
  onChange,
  onSearch,
  loading = false,
  placeholder,
  searchPlaceholder = "Buscar empresa...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled,
  className,
}: CompanyPickerProps) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const deferredQuery = useDeferredValue(internalQuery);

  useEffect(() => {
    if (!onSearch) return;

    const timeoutId = window.setTimeout(() => {
      onSearch(internalQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [internalQuery, onSearch]);

  const filtered = useMemo(() => {
    if (onSearch) return options;

    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.label, option.description, option.meta]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedQuery)),
    );
  }, [deferredQuery, onSearch, options]);

  const visibleOptions = useMemo(
    () => filtered.slice(0, MAX_VISIBLE_OPTIONS),
    [filtered],
  );

  const selected = options.find((option) => option.id === value);

  return (
    <Popover
      open={open}
      onOpenChange={(flag) => {
        setOpen(flag);
        if (!flag) {
          window.setTimeout(() => setInternalQuery(""), RESET_QUERY_DELAY_MS);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between overflow-hidden shadow-xs",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left text-sm font-medium">
            {selected?.label ?? placeholder}
          </span>
          {loading && !open ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] border-border/80 p-0 shadow-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={internalQuery}
              onChange={(event) => setInternalQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-none bg-muted/20 pl-9 pr-8 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
              autoFocus
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />
            ) : null}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto py-1.5 scrollbar-thin">
          {visibleOptions.map((option) => {
            const isSelected = option.id === value;
            const isContact = option.kind === "contact";

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                  isSelected && "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/50 text-muted-foreground">
                  {isContact ? (
                    <UserRound className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="block truncate font-semibold text-foreground/90">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {isContact ? (
                        <Building2 className="h-3 w-3 shrink-0 opacity-70" />
                      ) : (
                        <UserRound className="h-3 w-3 shrink-0 opacity-70" />
                      )}
                      {option.description}
                    </span>
                  ) : null}
                  {option.meta ? (
                    <span className="block truncate text-[11px] text-muted-foreground/70">
                      {option.meta}
                    </span>
                  ) : null}
                </div>
                {isSelected ? <Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}

          {filtered.length > MAX_VISIBLE_OPTIONS ? (
            <div className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground">
              Mostrando {MAX_VISIBLE_OPTIONS} de {filtered.length} resultados.
            </div>
          ) : null}

          {loading && !visibleOptions.length ? (
            <div className="space-y-3 px-3 py-4">
              <div className="flex animate-pulse items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted/50" />
                  <div className="h-2 w-1/2 rounded bg-muted/50" />
                </div>
              </div>
              <div className="flex animate-pulse items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-muted/50" />
                  <div className="h-2 w-1/3 rounded bg-muted/50" />
                </div>
              </div>
            </div>
          ) : null}

          {!visibleOptions.length && !loading ? (
            <div className="flex flex-col items-center justify-center px-3 py-6 text-center text-muted-foreground">
              <Building2 className="mb-2 h-6 w-6 opacity-20" />
              <p className="text-sm font-medium">{emptyMessage}</p>
              <p className="mt-1 text-[11px] opacity-70">
                Verifique o termo digitado ou cadastre-o.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-8 w-full bg-transparent text-xs hover:bg-muted/50"
                onClick={() => window.open("/portal/cadastros/empresa/novo", "_blank")}
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Cadastrar nova Empresa
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
