import {
  adminSuporteDataSchema,
  type AdminSuporteData,
} from "@dosc-syspro/contracts/dashboard";
import { fetchDashboardTabData } from "./dashboard-http";

export function getSuporteData(): Promise<AdminSuporteData> {
  return fetchDashboardTabData("/api/dashboard/suporte", adminSuporteDataSchema);
}
