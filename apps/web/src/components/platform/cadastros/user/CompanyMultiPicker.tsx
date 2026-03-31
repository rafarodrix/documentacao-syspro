// apps/web/src/components/platform/cadastros/user/CompanyMultiPicker.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Building2, ChevronsUpDown, Search, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface CompanyOption {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

interface CompanyMultiPickerProps {
  companies: CompanyOption[];
  /** ids ordenados: [0] = principal, [1..] = adicionais */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: string;
}

function getLabel(company: CompanyOption) {
  return company.nomeFantasia || company.razaoSocial;
}

export function CompanyMultiPicker({
  companies,
  value,
  onChange,
  disabled,
  error,
}: CompanyMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const primaryId = value[0] ?? null;
  const additionalIds = value.slice(1);

  const selectedMap = useMemo(
    () => new Set(value),
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      getLabel(c).toLowerCase().includes(q) ||
      c.razaoSocial.toLowerCase().includes(q),
    );
  }, [companies, query]);

  function toggle(id: string) {
    if (selectedMap.has(id)) {
      // remove — se for principal, promove o próximo
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function promoteToPrimary(id: string) {
    onChange([id, ...value.filter((v) => v !== id)]);
  }

  const selectedCompanies = value
    .map((id) => companies.find((c) => c.id === id))
    .filter(Boolean) as CompanyOption[];

  return (
    <div className="space-y-2">
      {/* Trigger */}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => inputRef.current?.focus(), 50); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between h-9 px-3 font-normal text-sm",
              !value.length && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
              {value.length === 0
                ? "Selecione empresa(s)..."
                : `${value.length} empresa${value.length > 1 ? "s" : ""} selecionada${value.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[380px] p-0 shadow-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar empresa..."
              className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0 bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nenhuma empresa encontrada.
              </p>
            ) : (
              filtered.map((company) => {
                const checked = selectedMap.has(company.id);
                const isPrimary = company.id === primaryId;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => toggle(company.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm text-left",
                      "hover:bg-muted/60 transition-colors",
                      checked && "bg-primary/5",
                    )}
                  >
                    {/* checkbox visual */}
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input bg-background",
                      )}
                    >
                      {checked && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-current">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>

                    <span className="flex-1 truncate">{getLabel(company)}</span>

                    {isPrimary && (
                      <Badge variant="outline" className="h-4 rounded-full border-amber-400/40 bg-amber-400/10 px-1.5 text-[9px] font-semibold text-amber-600 shrink-0">
                        Principal
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {value.length > 0 && (
            <div className="border-t px-3 py-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {value.length} selecionada{value.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar tudo
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selectedCompanies.length > 0 && (
        <div className="rounded-md border border-border/60 bg-muted/10 p-2 space-y-1.5">
          {selectedCompanies.map((company, index) => {
            const isPrimary = index === 0;
            return (
              <div
                key={company.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs group",
                  isPrimary
                    ? "bg-amber-500/5 border border-amber-400/20"
                    : "bg-muted/40 border border-border/40",
                )}
              >
                <Building2 className={cn("h-3 w-3 shrink-0", isPrimary ? "text-amber-500" : "text-muted-foreground")} />
                <span className="flex-1 truncate font-medium">{getLabel(company)}</span>

                {isPrimary ? (
                  <Badge variant="outline" className="h-4 rounded-full border-amber-400/40 bg-amber-400/10 px-1.5 text-[9px] text-amber-600 shrink-0">
                    <Star className="h-2.5 w-2.5 mr-0.5" />
                    Principal
                  </Badge>
                ) : (
                  <button
                    type="button"
                    title="Tornar empresa principal"
                    onClick={() => promoteToPrimary(company.id)}
                    className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground hover:text-amber-500 transition-all flex items-center gap-0.5 shrink-0"
                  >
                    <Star className="h-2.5 w-2.5" />
                    <span>Tornar principal</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => remove(company.id)}
                  aria-label={`Remover ${getLabel(company)}`}
                  className="ml-auto rounded p-0.5 hover:bg-background/60 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground px-1">
            A primeira empresa é a principal. Passe o mouse sobre uma adicional para promovê-la.
          </p>
        </div>
      )}

      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
    </div>
  );
}