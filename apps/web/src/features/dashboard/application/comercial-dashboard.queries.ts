import {
  adminComercialDataSchema,
  type AdminComercialData,
} from "@dosc-syspro/contracts/dashboard";
import { fetchDashboardTabData } from "./dashboard-http";

export function getComercialData(): Promise<AdminComercialData> {
  return fetchDashboardTabData("/api/dashboard/comercial", adminComercialDataSchema);
}
