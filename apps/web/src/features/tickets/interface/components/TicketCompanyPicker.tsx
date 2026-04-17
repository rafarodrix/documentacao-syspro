"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader2, Search, UserRound, PlusCircle } from "lucide-react";

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
  onSearch?: (query: string) => void;
  loading?: boolean;
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
  onSearch,
  loading = false,
  placeholder,
  searchPlaceholder = "Buscar empresa...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled,
  className,
}: TicketCompanyPickerProps) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");

  const handleInputChange = (val: string) => {
    setInternalQuery(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  const filtered = useMemo(() => {
    if (onSearch) return options; // If async search is active, the parent strictly controls the options
    const normalizedQuery = internalQuery.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.label, option.description, option.meta]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(normalizedQuery)),
    );
  }, [options, internalQuery, onSearch]);

  const selected = options.find((option) => option.id === value);

  return (
    <Popover open={open} onOpenChange={(flag) => {
        setOpen(flag);
        if (!flag && onSearch) {
          // Quando fechar o popover limpamos a query pra não ficar salvo sujeira proximo abri-lo
          setTimeout(() => handleInputChange(""), 150);
        }
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between overflow-hidden shadow-xs", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate text-left text-sm font-medium">{selected?.label ?? placeholder}</span>
          {loading && !open ? (
             <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
             <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] p-0 shadow-lg border-border/80"
        onOpenAutoFocus={(event) => event.preventDefault()} // impede focar direto no input para não abrir teclado no mobile abruptamente
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={internalQuery}
              onChange={(event) => handleInputChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 bg-muted/20 pl-9 pr-8 text-sm focus-visible:ring-1 border-none shadow-none focus-visible:ring-offset-0"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary animate-spin" />
            )}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto py-1.5 scrollbar-thin">
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
                  "flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors",
                  isSelected && "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center shrink-0 rounded-md bg-muted/50 border border-border/50 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="block truncate font-semibold text-foreground/90">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <UserRound className="h-3 w-3 shrink-0 opacity-70" />
                      {option.description}
                    </span>
                  ) : null}
                  {option.meta ? <span className="block truncate text-[10px] uppercase text-muted-foreground/70">{option.meta}</span> : null}
                </div>
                {isSelected ? <Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}

          {loading && !filtered.length ? (
            <div className="px-3 py-4 space-y-3">
               <div className="flex items-center gap-3 animate-pulse">
                 <div className="h-7 w-7 rounded-md bg-muted/50" />
                 <div className="space-y-2 flex-1"><div className="h-3 w-2/3 bg-muted/50 rounded" /><div className="h-2 w-1/2 bg-muted/50 rounded" /></div>
               </div>
               <div className="flex items-center gap-3 animate-pulse">
                 <div className="h-7 w-7 rounded-md bg-muted/50" />
                 <div className="space-y-2 flex-1"><div className="h-3 w-1/2 bg-muted/50 rounded" /><div className="h-2 w-1/3 bg-muted/50 rounded" /></div>
               </div>
            </div>
          ) : null}

          {!filtered.length && !loading ? (
            <div className="px-3 py-6 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Building2 className="h-6 w-6 opacity-20 mb-2" />
                <p className="text-sm font-medium">{emptyMessage}</p>
                <p className="text-[11px] mt-1 opacity-70">Verifique o termo digitado ou cadastre-o.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 h-8 text-xs bg-transparent hover:bg-muted/50"
                  onClick={() => window.open("/portal/cadastros/empresas/novo", "_blank")}
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Cadastrar novo Contato
                </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
