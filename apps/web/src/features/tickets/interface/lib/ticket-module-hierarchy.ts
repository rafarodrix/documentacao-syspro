import type { TicketModuleSettingsOption } from "@dosc-syspro/contracts/ticket";

const MODULE_LABEL_SEPARATOR = " > ";

function splitModuleSegments(value?: string | null) {
  return String(value ?? "")
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function slugifySegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeModuleHierarchyLabel(value?: string | null) {
  const segments = splitModuleSegments(value);
  return segments.join(MODULE_LABEL_SEPARATOR);
}

export function buildModuleHierarchyValue(value?: string | null) {
  const segments = splitModuleSegments(value).map(slugifySegment).filter(Boolean);
  return segments.join("/");
}

export function getModuleHierarchyDepth(value?: string | null) {
  return Math.max(0, splitModuleSegments(value).length - 1);
}

export function formatModuleOptionLabel(option: Pick<TicketModuleSettingsOption, "label" | "value">) {
  const normalizedLabel = normalizeModuleHierarchyLabel(option.label);
  if (normalizedLabel) return normalizedLabel;
  return humanizeModuleHierarchyValue(option.value);
}

export function humanizeModuleHierarchyValue(value?: string | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  return normalized
    .split("/")
    .map((segment) =>
      segment
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .filter(Boolean)
    .join(MODULE_LABEL_SEPARATOR);
}
