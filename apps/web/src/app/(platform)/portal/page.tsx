import { requireSession } from "@/lib/auth-helpers";
import type { SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { getDashboardData, getOperacionalData, getCadastrosData, getComercialData } from "@/features/dashboard/application/server";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { AdminDashboard } from "@/features/dashboard/interface/admin-dashboard";
import { ClientDashboard } from "@/features/dashboard/interface/client-dashboard";
import { redirect } from "next/navigation";

const DASHBOARD_VIEW_AVAILABILITY = "dashboard:view_availability" as SettingsPermissionKey;
const DASHBOARD_VIEW_INTERNAL = "dashboard:view_internal" as SettingsPermissionKey;

export default async function DashboardPage() {
  await requireSession();
  const [canAccessCrm, canAccessCadastros, canViewAvailability, hasInternalDashboard] = await Promise.all([
    currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }),
    currentUserHasAnyPermission(
      [
        "companies:view",
        "companies:view_own",
        "companies:view_all",
        "companies:view_cockpit",
        "contacts:view",
        "contacts:view_team",
        "contacts:view_all",
        "users:view",
        "users:view_team",
        "users:view_all",
        "users:manage_internal",
      ],
      { acceptCompanyScope: true },
    ),
    currentUserHasPermission(DASHBOARD_VIEW_AVAILABILITY, { acceptCompanyScope: true }),
    currentUserHasPermission(DASHBOARD_VIEW_INTERNAL),
  ]);

  if (hasInternalDashboard) {
    const [operacionalData, cadastrosData, comercialData] = await Promise.all([
      getOperacionalData(),
      canAccessCadastros ? getCadastrosData().catch(() => null) : null,
      canAccessCrm ? getComercialData().catch(() => null) : null,
    ]);

    return (
      <AdminDashboard
        canAccessCrm={canAccessCrm}
        canAccessCadastros={canAccessCadastros}
        canViewAvailability={canViewAvailability}
        statusSummary={{
          ticketCounts: operacionalData.ticketCounts,
          sefazHealth: operacionalData.sefazHealth,
          sefazRoutesCount: operacionalData.sefazRoutesCount,
        }}
        cadastrosSummary={cadastrosData ? {
          companiesCount: cadastrosData.cadastros?.companies.total ?? cadastrosData.companiesCount,
        } : undefined}
        comercialSummary={comercialData ? {
          activeLeadsCount: comercialData.crm?.activeLeads ?? 0,
        } : undefined}
      />
    );
  }

  if (canAccessCadastros) {
    redirect("/portal/cadastros");
  }

  if (canAccessCrm) {
    redirect("/portal/comercial/leads");
  }

  const data = await getDashboardData();
  if (data.mode !== "client") {
    return null;
  }
  return <ClientDashboard data={data} canViewAvailability={canViewAvailability} />;
}
