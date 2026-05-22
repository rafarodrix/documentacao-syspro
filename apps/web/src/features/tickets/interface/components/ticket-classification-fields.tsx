"use client";

import { type TicketModulePriority, type TicketModuleSettingsOption, type TicketModuleSettingsPriority, type TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import { formatModuleOptionLabel, humanizeModuleHierarchyValue } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { normalizeStatusValue } from "./ticket-details.helpers";
import { statusOptions } from "./ticket-details.constants";

export function resolveOptionLabel(
  options: TicketModuleSettingsOption[],
  value?: string | null,
  fallback = "Nao definido",
) {
  const normalized = (value || "").trim();
  if (!normalized) return fallback;
  const option = options.find(
    (item) =>
      item.value.toLowerCase() === normalized.toLowerCase() ||
      item.label.toLowerCase() === normalized.toLowerCase(),
  );
  return option ? formatModuleOptionLabel(option) : humanizeModuleHierarchyValue(normalized) || normalized;
}

export function getCategoriesForTeam(
  categories: TicketModuleSettingsOption[],
  team?: string | null,
  currentCategory?: string | null,
) {
  const normalizedTeam = (team || "").trim().toUpperCase();
  const filtered = categories.filter((category) => !category.defaultTeam || category.defaultTeam === normalizedTeam);
  const options = filtered.length ? filtered : categories;
  const current = (currentCategory || "").trim();

  if (!current || options.some((category) => category.value.toLowerCase() === current.toLowerCase())) {
    return options;
  }

  const currentOption = categories.find((category) => category.value.toLowerCase() === current.toLowerCase());
  return currentOption ? [currentOption, ...options] : options;
}

function mapPriorityToLevel(priority: TicketModulePriority) {
  if (priority === "LOW") return 1;
  if (priority === "HIGH" || priority === "CRITICAL") return 3;
  return 2;
}

function parsePriorityOption(option: TicketModuleSettingsPriority): TicketModulePriority {
  const value = `${option.id} ${option.value} ${option.label}`.toLowerCase();
  if (value.includes("low") || value.includes("baixa") || option.id === "1") return "LOW";
  if (value.includes("high") || value.includes("alta") || value.includes("urgent") || option.id === "3") return "HIGH";
  return "NORMAL";
}

function resolvePriorityLabel(priority: number, options: TicketModuleSettingsPriority[]) {
  const match = options.find((option) => mapPriorityToLevel(parsePriorityOption(option)) === priority);
  if (match) return match.label;
  if (priority === 3) return "Alta";
  if (priority === 1) return "Baixa";
  return "Normal";
}

export function NativeSelectPill({
  id,
  value,
  label,
  disabled,
  options,
  onChange,
}: {
  id?: string;
  value: string;
  label: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  if (disabled) return <span className="text-xs">{label}</span>;

  const emptyValue = "__empty__";
  const selectedValue = value || emptyValue;
  const normalizedOptions = options.some((option) => option.value === value)
    ? options
    : [{ value: selectedValue, label }, ...options];

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (nextValue === emptyValue || nextValue === value) return;
        onChange(nextValue);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className="h-10 w-full rounded-md border-border/70 bg-background px-3 text-left text-sm font-medium text-foreground shadow-none transition-colors hover:border-primary/40 hover:bg-muted/30 focus:ring-2 focus:ring-primary/15"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" className="z-80 min-w-[var(--radix-select-trigger-width)] border-border/70 bg-popover text-popover-foreground">
        {normalizedOptions.map((option, index) => (
          <SelectItem key={`${option.value}-${index}`} value={option.value} className="text-sm">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ClassificationDropdown({
  value,
  fallback,
  options,
  disabled,
  onChange,
}: {
  value?: string | null;
  fallback: string;
  options: TicketModuleSettingsOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const currentLabel = resolveOptionLabel(options, value, fallback);
  const currentValue = (value || "").trim();

  if (disabled) return <span className="text-xs">{currentLabel}</span>;

  return (
    <NativeSelectPill
      value={currentValue}
      label={currentLabel}
      options={options.map((option) => ({ value: option.value, label: option.label }))}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export function PriorityDropdown({
  priority,
  options,
  disabled,
  onChange,
}: {
  priority: number;
  options: TicketModuleSettingsPriority[];
  disabled?: boolean;
  onChange: (priority: TicketModulePriority) => void;
}) {
  const currentLabel = resolvePriorityLabel(priority, options);

  if (disabled) return <span className="text-xs">{currentLabel}</span>;

  return (
    <NativeSelectPill
      value={String(priority)}
      label={currentLabel}
      options={options.map((option) => ({
        value: String(mapPriorityToLevel(parsePriorityOption(option))),
        label: option.label,
      }))}
      disabled={disabled}
      onChange={(value) => {
        const selected = options.find((option) => String(mapPriorityToLevel(parsePriorityOption(option))) === value);
        onChange(selected ? parsePriorityOption(selected) : value === "3" ? "HIGH" : value === "1" ? "LOW" : "NORMAL");
      }}
    />
  );
}

export function StatusDropdown({
  status,
  disabled,
  onChange,
}: {
  status?: string | null;
  disabled?: boolean;
  onChange: (status: TicketModuleStatus) => void;
}) {
  const current = normalizeStatusValue(status);

  if (disabled) return <span className="text-xs">{status || "Desconhecido"}</span>;

  return (
    <NativeSelectPill
      value={current || ""}
      label={status || "Desconhecido"}
      options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
      disabled={disabled}
      onChange={(value) => onChange(value as TicketModuleStatus)}
    />
  );
}
