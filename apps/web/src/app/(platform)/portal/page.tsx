import { requireSession } from "@/lib/auth-helpers";
import type { SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { getDashboardData } from "@/features/dashboard/application";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { AdminDashboard } from "@/features/dashboard/interface/admin-dashboard";
import { ClientDashboard } from "@/features/dashboard/interface/client-dashboard";

const DASHBOARD_VIEW_AVAILABILITY = "dashboard:view_availability" as SettingsPermissionKey;

export default async function DashboardPage() {
  const session = await requireSession();
  const [canAccessCrm, canViewAvailability, data] = await Promise.all([
    currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }),
    currentUserHasPermission(DASHBOARD_VIEW_AVAILABILITY, { acceptCompanyScope: true }),
    getDashboardData(),
  ]);

  if (data.mode === "admin") {
    return (
      <AdminDashboard
        data={data}
        role={session.role}
        canAccessCrm={canAccessCrm}
        canViewAvailability={canViewAvailability}
      />
    );
  }

  return <ClientDashboard data={data} canViewAvailability={canViewAvailability} />;
}
