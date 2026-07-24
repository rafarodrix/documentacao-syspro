import type { DeviceLifecycleStatus, DeviceListItem } from "@dosc-syspro/contracts";

const DEVICE_BASE_PATH = "/portal/infraestrutura/dispositivos";

/** Discovered/ignored rows share ARCHIVED with inactive managed hosts; null installation id marks discovered entities. */
export function isDiscoveredDeviceListItem(
  item: Pick<DeviceListItem, "lifecycle" | "agentInstallationId">,
): boolean {
  if (item.lifecycle === "DISCOVERED") return true;
  return item.lifecycle === "ARCHIVED" && item.agentInstallationId == null;
}

export function isManagedDeviceListItem(
  item: Pick<DeviceListItem, "lifecycle" | "agentInstallationId">,
): boolean {
  return !isDiscoveredDeviceListItem(item);
}

export function deviceDetailPath(
  item: Pick<DeviceListItem, "id" | "lifecycle" | "agentInstallationId">,
): string {
  const id = encodeURIComponent(item.id);
  if (isDiscoveredDeviceListItem(item)) {
    return `${DEVICE_BASE_PATH}/descobertos/${id}`;
  }
  return `${DEVICE_BASE_PATH}/${id}`;
}

export function deviceDetailHref(
  item: Pick<DeviceListItem, "id" | "lifecycle" | "agentInstallationId">,
  query?: { tab?: string; edit?: boolean },
): string {
  const base = deviceDetailPath(item);
  if (!query) return base;

  const params = new URLSearchParams();
  if (query.tab) params.set("tab", query.tab);
  if (query.edit) params.set("edit", "true");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export type HostDetailsTab =
  | "geral"
  | "diagnostico"
  | "servicos"
  | "erp"
  | "bkp"
  | "eventos"
  | "configuracoes";

const HOST_DETAILS_TABS: readonly HostDetailsTab[] = [
  "geral",
  "diagnostico",
  "servicos",
  "erp",
  "bkp",
  "eventos",
  "configuracoes",
];

export function parseHostDetailsTab(value: string | null | undefined): HostDetailsTab {
  return HOST_DETAILS_TABS.includes(value as HostDetailsTab) ? (value as HostDetailsTab) : "geral";
}

export function deviceManagedDetailPath(deviceId: string) {
  return `${DEVICE_BASE_PATH}/${encodeURIComponent(deviceId)}`;
}

export type { DeviceLifecycleStatus };
