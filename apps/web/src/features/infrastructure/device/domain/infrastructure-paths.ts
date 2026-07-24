import type { DeviceLifecycleStatus } from "@dosc-syspro/contracts";
import { parseOperationsView, type OperationsView } from "@/features/remote/interface/operations-view";

export const INFRASTRUCTURE_BASE_PATH = "/portal/infraestrutura";
export const DEVICE_LIST_HREF = `${INFRASTRUCTURE_BASE_PATH}?tab=dispositivos`;
export const OPERATIONS_BASE_HREF = `${INFRASTRUCTURE_BASE_PATH}?tab=operacao`;

export type InfrastructureListTab = "dispositivos" | "operacao";

export function infrastructureTabHref(
  tab: InfrastructureListTab,
  params?: {
    companyId?: string;
    ticketNumber?: string;
    view?: OperationsView | string;
    status?: string;
    host?: string;
    ticket?: string;
    page?: string | number;
    newHost?: boolean;
    lifecycle?: DeviceLifecycleStatus | "ALL";
  },
) {
  const next = new URLSearchParams({ tab });

  if (tab === "dispositivos") {
    if (params?.companyId) next.set("companyId", params.companyId);
    if (params?.ticketNumber) next.set("ticketNumber", params.ticketNumber);
    if (params?.lifecycle && params.lifecycle !== "MANAGED" && params.lifecycle !== "ALL") {
      next.set("lifecycle", params.lifecycle);
    }
    if (params?.newHost) next.set("newHost", "true");
  }

  if (tab === "operacao") {
    next.set("view", parseOperationsView(String(params?.view ?? "em_andamento")));
    if (params?.status) next.set("status", params.status);
    if (params?.host) next.set("host", params.host);
    if (params?.ticket) next.set("ticket", params.ticket);
    if (params?.page) next.set("page", String(params.page));
  }

  return `${INFRASTRUCTURE_BASE_PATH}?${next.toString()}`;
}

export {
  deviceDetailHref,
  deviceDetailPath,
  deviceManagedDetailPath,
  isDiscoveredDeviceListItem,
  isManagedDeviceListItem,
  parseHostDetailsTab,
  type HostDetailsTab,
} from "./device-detail-paths";
