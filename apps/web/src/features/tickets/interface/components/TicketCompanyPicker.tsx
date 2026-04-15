"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TicketCompanyPickerOption = {
  id: string;
  label: string;
  description?: string | null;
  meta?: string | null;
};

interface TicketCompanyPickerProps {
  value: string;
  options: TicketCompanyPickerOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function TicketCompanyPicker({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder = "Buscar empresa...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled,
  className,
}: TicketCompanyPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.label, option.description, option.meta]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [options, query]);

  const selected = options.find((option) => option.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate text-left">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b p-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.map((option) => {
            const isSelected = option.id === value;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2 text-left text-xs hover:bg-muted/60",
                  isSelected && "bg-primary/5",
                )}
              >
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <UserRound className="h-3 w-3 shrink-0" />
                      {option.description}
                    </span>
                  ) : null}
                  {option.meta ? <span className="block truncate text-[11px] text-muted-foreground">{option.meta}</span> : null}
                </span>
                {isSelected ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : null}
              </button>
            );
          })}

          {!filtered.length ? <p className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyMessage}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
