import {
  adminOperacionalDataSchema,
  type AdminOperacionalData,
} from "@dosc-syspro/contracts/dashboard";
import { fetchDashboardTabData } from "./dashboard-http";

export function getOperacionalData(): Promise<AdminOperacionalData> {
  return fetchDashboardTabData("/api/dashboard/operacional", adminOperacionalDataSchema);
}
