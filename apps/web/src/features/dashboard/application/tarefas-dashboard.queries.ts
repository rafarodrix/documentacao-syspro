import {
  adminTarefasDataSchema,
  type AdminTarefasData,
} from "@dosc-syspro/contracts/dashboard";
import { fetchDashboardTabData } from "./dashboard-http";

export function getTarefasData(): Promise<AdminTarefasData> {
  return fetchDashboardTabData("/api/dashboard/suporte/tarefas", adminTarefasDataSchema);
}
