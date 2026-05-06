import { requireSession } from "@/lib/auth-helpers";
import type { SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { getDashboardData } from "@/features/dashboard/application";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { AdminDashboard } from "@/features/dashboard/interface/admin-dashboard";
import { ClientDashboard } from "@/features/dashboard/interface/client-dashboard";

const DASHBOARD_VIEW_AVAILABILITY = "dashboard:view_availability" as SettingsPermissionKey;
const SYSTEM_ROLES = new Set(["ADMIN", "DEVELOPER", "SUPORTE"]);

export default async function DashboardPage() {
  const session = await requireSession();
  const [canAccessCrm, canViewAvailability] = await Promise.all([
    currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }),
    currentUserHasPermission(DASHBOARD_VIEW_AVAILABILITY, { acceptCompanyScope: true }),
  ]);

  if (SYSTEM_ROLES.has(session.role)) {
    return (
      <AdminDashboard
        role={session.role}
        canAccessCrm={canAccessCrm}
        canViewAvailability={canViewAvailability}
      />
    );
  }

  const data = await getDashboardData();
  if (data.mode !== "client") {
    return null;
  }
  return <ClientDashboard data={data} canViewAvailability={canViewAvailability} />;
}
