import {
  adminCadastrosDataSchema,
  type AdminCadastrosData,
} from "@dosc-syspro/contracts/dashboard";
import { fetchDashboardTabData } from "./dashboard-http";

export function getCadastrosData(): Promise<AdminCadastrosData> {
  return fetchDashboardTabData("/api/dashboard/cadastros", adminCadastrosDataSchema);
}
