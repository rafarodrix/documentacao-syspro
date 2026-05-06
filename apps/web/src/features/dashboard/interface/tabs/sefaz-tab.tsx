import { SefazOperationsPanel } from "@/components/sefaz/sefaz-operations-panel";
import type {
  DashboardSefazConfiguredRoute,
  DashboardSefazStatus,
} from "@dosc-syspro/contracts/dashboard";

export function SefazTab({
  focusUfs,
  scopedStatuses,
  nationalStatuses,
  configuredRoutes,
  canViewAvailability,
}: {
  focusUfs: string[];
  scopedStatuses: DashboardSefazStatus[];
  nationalStatuses: DashboardSefazStatus[];
  configuredRoutes: DashboardSefazConfiguredRoute[];
  canViewAvailability: boolean;
}) {
  return (
    <SefazOperationsPanel
      focusUfs={focusUfs}
      scopedStatuses={scopedStatuses}
      nationalStatuses={nationalStatuses}
      configuredRoutes={configuredRoutes}
      canViewAvailability={canViewAvailability}
    />
  );
}
