"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import type { TicketModuleSettingsOption } from "@dosc-syspro/contracts/ticket";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger, ScrollArea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import { getTicketModuleCascadeState, resolveTicketModuleValueFromCascade } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { cn } from "@/lib/utils";

type TicketModuleCascadeSelectProps = {
  options: TicketModuleSettingsOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  mode?: "cascade" | "single";
  labels?: {
    module?: string;
    submodule?: string;
    screen?: string;
    single?: string;
  };
  compact?: boolean;
};

export function TicketModuleCascadeSelect({
  options,
  value,
  onChange,
  disabled,
  mode = "cascade",
  labels,
  compact = false,
}: TicketModuleCascadeSelectProps) {
  const state = getTicketModuleCascadeState(options, value);
  const triggerClassName = compact ? "h-9" : "h-10";

  if (mode === "single") {
    return (
      <SearchableSingleModuleField
        label={labels?.single ?? "Modulo"}
        value={value || ""}
        options={state.entries.map((entry) => ({
          value: entry.option.value,
          label: entry.label,
          root: entry.segments[0] ?? "",
        }))}
        placeholder="Selecione o modulo"
        onChange={onChange}
        disabled={disabled || state.entries.length === 0}
        triggerClassName={triggerClassName}
      />
    );
  }

  const handleModuleChange = (module: string) => {
    onChange(resolveTicketModuleValueFromCascade(options, { module }));
  };

  const handleSubmoduleChange = (submodule: string) => {
    onChange(resolveTicketModuleValueFromCascade(options, { module: state.selectedModule, submodule }));
  };

  const handleScreenChange = (screen: string) => {
    onChange(
      resolveTicketModuleValueFromCascade(options, {
        module: state.selectedModule,
        submodule: state.selectedSubmodule,
        screen,
      }),
    );
  };

  return (
    <div className="grid gap-3">
      <CascadeSelectField
        label={labels?.module ?? "Modulo"}
        value={state.selectedModule}
        options={state.modules}
        placeholder="Selecione o modulo"
        onChange={handleModuleChange}
        disabled={disabled || state.modules.length === 0}
        triggerClassName={triggerClassName}
      />

      <CascadeSelectField
        label={labels?.submodule ?? "Submodulo"}
        value={state.selectedSubmodule}
        options={state.submodules}
        placeholder="Selecione o submodulo"
        onChange={handleSubmoduleChange}
        disabled={disabled || state.submodules.length === 0}
        triggerClassName={triggerClassName}
      />

      <CascadeSelectField
        label={labels?.screen ?? "Tela"}
        value={state.selectedScreen}
        options={state.screens}
        placeholder="Selecione a tela"
        onChange={handleScreenChange}
        disabled={disabled || state.screens.length === 0}
        triggerClassName={triggerClassName}
      />
    </div>
  );
}

function SearchableSingleModuleField({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
  triggerClassName,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; root: string }>;
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) => {
      const searchable = `${option.label} ${option.root} ${option.value}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [options, query]);

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between rounded-md border-border/70 bg-background px-3 text-left text-sm font-medium shadow-none hover:bg-muted/30",
              triggerClassName,
            )}
          >
            <span className="min-w-0 truncate text-left">
              {selectedOption?.label || <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] p-0">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar modulo, submenu ou tela"
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="max-h-72">
            <div className="p-1.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum modulo encontrado.
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const showGroupLabel = index === 0 || filteredOptions[index - 1]?.root !== option.root;
                  const isSelected = option.value === value;

                  return (
                    <div key={option.value}>
                      {showGroupLabel ? (
                        <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {option.root}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                          isSelected && "bg-primary/8 text-foreground",
                        )}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100 text-primary" : "opacity-0")} />
                        <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CascadeSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
  triggerClassName,
}: {
  label: string;
  value: string;
  options: string[] | Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  triggerClassName: string;
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
