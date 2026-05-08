import { requireSession } from "@/lib/auth-helpers";
import type { SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { getDashboardData } from "@/features/dashboard/application";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { AdminDashboard } from "@/features/dashboard/interface/admin-dashboard";
import { ClientDashboard } from "@/features/dashboard/interface/client-dashboard";

const DASHBOARD_VIEW_AVAILABILITY = "dashboard:view_availability" as SettingsPermissionKey;

export default async function DashboardPage() {
  await requireSession();
  const [canAccessCrm, canAccessCadastros, canViewAvailability, hasInternalDashboard] = await Promise.all([
    currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }),
    currentUserHasAnyPermission(
      ["companies:view_all", "users:view_all", "contacts:view_all", "users:manage_internal"],
      { acceptCompanyScope: true },
    ),
    currentUserHasPermission(DASHBOARD_VIEW_AVAILABILITY, { acceptCompanyScope: true }),
    currentUserHasPermission("users:view_internal"),
  ]);

  if (hasInternalDashboard) {
    return (
      <AdminDashboard
        canAccessCrm={canAccessCrm}
        canAccessCadastros={canAccessCadastros}
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
