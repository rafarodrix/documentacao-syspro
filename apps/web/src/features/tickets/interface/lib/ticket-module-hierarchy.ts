import type { TicketModuleSettingsOption } from "@dosc-syspro/contracts/ticket";

const MODULE_LABEL_SEPARATOR = " > ";
const MODULE_ROOT_ORDER = [
  "Cadastro",
  "Estoque",
  "Compra",
  "Financeiro",
  "Movimento",
  "Fiscal",
  "Contabil",
  "Producao",
  "Venda",
  "Relatorio",
] as const;

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

export type TicketModuleHierarchyEntry = {
  option: TicketModuleSettingsOption;
  segments: string[];
  label: string;
  sortIndex: number;
};

function compareSegments(left: string[], right: string[]) {
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftSegment = left[index] ?? "";
    const rightSegment = right[index] ?? "";
    if (!leftSegment && !rightSegment) continue;
    if (!leftSegment) return -1;
    if (!rightSegment) return 1;

    const result = leftSegment.localeCompare(rightSegment, "pt-BR", { sensitivity: "base" });
    if (result !== 0) return result;
  }

  return 0;
}

export function sortTicketModuleOptions(options: TicketModuleSettingsOption[]) {
  return [...options].sort((left, right) => {
    const leftSegments = getModuleHierarchySegments(left);
    const rightSegments = getModuleHierarchySegments(right);
    const leftRoot = leftSegments[0] ?? "";
    const rightRoot = rightSegments[0] ?? "";
    const leftRootIndex = MODULE_ROOT_ORDER.indexOf(leftRoot as (typeof MODULE_ROOT_ORDER)[number]);
    const rightRootIndex = MODULE_ROOT_ORDER.indexOf(rightRoot as (typeof MODULE_ROOT_ORDER)[number]);
    const normalizedLeftRootIndex = leftRootIndex === -1 ? Number.MAX_SAFE_INTEGER : leftRootIndex;
    const normalizedRightRootIndex = rightRootIndex === -1 ? Number.MAX_SAFE_INTEGER : rightRootIndex;

    if (normalizedLeftRootIndex !== normalizedRightRootIndex) {
      return normalizedLeftRootIndex - normalizedRightRootIndex;
    }

    return compareSegments(leftSegments, rightSegments);
  });
}

export function getModuleHierarchySegments(option: Pick<TicketModuleSettingsOption, "label" | "value">) {
  const labelSegments = splitModuleSegments(option.label);
  if (labelSegments.length > 0) return labelSegments;

  return String(option.value ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    );
}

export function buildTicketModuleHierarchy(options: TicketModuleSettingsOption[]): TicketModuleHierarchyEntry[] {
  return sortTicketModuleOptions(options)
    .map((option, sortIndex) => {
      const segments = getModuleHierarchySegments(option);
      return {
        option,
        segments,
        label: segments.join(MODULE_LABEL_SEPARATOR),
        sortIndex,
      };
    })
    .filter((entry) => entry.segments.length > 0);
}

export function getTicketModuleCascadeState(options: TicketModuleSettingsOption[], selectedValue?: string | null) {
  const entries = buildTicketModuleHierarchy(options);
  const selectedEntry =
    entries.find((entry) => entry.option.value === selectedValue) ??
    entries.find((entry) => entry.option.label === selectedValue) ??
    null;

  const selectedModule = selectedEntry?.segments[0] ?? "";
  const selectedSubmodule = selectedEntry?.segments[1] ?? "";
  const selectedScreen = selectedEntry?.segments[2] ?? "";

  const modules = Array.from(new Set(entries.map((entry) => entry.segments[0]).filter(Boolean)));
  const submodules = Array.from(
    new Set(
      entries
        .filter((entry) => entry.segments[0] === selectedModule)
        .map((entry) => entry.segments[1])
        .filter(Boolean),
    ),
  );
  const screens = Array.from(
    new Set(
      entries
        .filter((entry) => entry.segments[0] === selectedModule && entry.segments[1] === selectedSubmodule)
        .map((entry) => entry.segments[2])
        .filter(Boolean),
    ),
  );

  return {
    entries,
    selectedEntry,
    selectedModule,
    selectedSubmodule,
    selectedScreen,
    modules,
    submodules,
    screens,
  };
}

export function resolveTicketModuleValueFromCascade(
  options: TicketModuleSettingsOption[],
  selection: { module?: string; submodule?: string; screen?: string },
) {
  const entries = buildTicketModuleHierarchy(options);
  const { module = "", submodule = "", screen = "" } = selection;

  const exactScreen = entries.find(
    (entry) =>
      entry.segments[0] === module &&
      entry.segments[1] === submodule &&
      entry.segments[2] === screen,
  );
  if (exactScreen) return exactScreen.option.value;

  const exactSubmodule = entries.find(
    (entry) =>
      entry.segments[0] === module &&
      entry.segments[1] === submodule &&
      entry.segments.length === 2,
  );
  if (exactSubmodule) return exactSubmodule.option.value;

  const firstUnderSubmodule = entries.find(
    (entry) => entry.segments[0] === module && entry.segments[1] === submodule,
  );
  if (firstUnderSubmodule) return firstUnderSubmodule.option.value;

  const exactModule = entries.find((entry) => entry.segments[0] === module && entry.segments.length === 1);
  if (exactModule) return exactModule.option.value;

  const firstUnderModule = entries.find((entry) => entry.segments[0] === module);
  return firstUnderModule?.option.value ?? "";
}
