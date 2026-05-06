import { Activity, Building2, Headset, Target, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AdminDashboardView } from "@dosc-syspro/contracts/dashboard";
import { OperacionalTab } from "./tabs/operacional-tab";
import { SuporteTab } from "./tabs/suporte-tab";
import { SefazTab } from "./tabs/sefaz-tab";
import { CadastrosTab } from "./tabs/cadastros-tab";
import { ComercialTab } from "./tabs/comercial-tab";

type SefazHealth = "online" | "unstable" | "offline" | "unknown";

function getSefazHealth(data: AdminDashboardView): SefazHealth {
  const statuses = data.sefazStatuses ?? [];
  if (statuses.some((s) => s.status === "OFFLINE")) return "offline";
  if (statuses.some((s) => s.status === "UNSTABLE")) return "unstable";
  if (statuses.length > 0) return "online";
  return "unknown";
}

const sefazBadgeClasses: Record<SefazHealth, string> = {
  online: "bg-emerald-500/15 text-emerald-600",
  unstable: "bg-amber-500/15 text-amber-600",
  offline: "bg-red-500/15 text-red-600",
  unknown: "bg-background/80 text-muted-foreground",
};

const sefazBadgeLabels: Record<SefazHealth, string> = {
  online: "OK",
  unstable: "!",
  offline: "↓",
  unknown: "—",
};

export function AdminDashboard({
  data,
  role,
  canAccessCrm,
  canViewAvailability,
}: {
  data: AdminDashboardView;
  role: string;
  canAccessCrm: boolean;
  canViewAvailability: boolean;
}) {
  const scopeMode = role === "DEVELOPER" ? "development" : "all";
  const allowAreaFilter = role === "ADMIN";

  const scopedRecords =
    scopeMode === "development"
      ? data.openTicketRecords.filter((r) => r.team === "DESENVOLVIMENTO")
      : data.openTicketRecords;

  const openTicketsNow = scopedRecords.length;
  const openTicketsSupport = scopedRecords.filter((r) => r.team === "SUPORTE").length;
  const openTicketsDevelopment = scopedRecords.filter((r) => r.team === "DESENVOLVIMENTO").length;
  const openTicketsWaiting = scopedRecords.filter((r) => r.status === "Aberto").length;
  const openTicketsInProgress = scopedRecords.filter((r) => r.status !== "Aberto").length;

  const sefazHealth = getSefazHealth(data);
  const sefazRoutesCount = (data.sefazConfiguredRoutes ?? []).filter((r) => r.active).length;

  const canViewCompanies = data.canViewCompanies ?? true;
  const canViewContacts = data.canViewContacts ?? true;
  const canViewUsers = data.canViewUsers ?? true;
  const hasCadastrosAccess = canViewCompanies || canViewContacts || canViewUsers;
  const cadastroTabsCount = [canViewCompanies, canViewContacts, canViewUsers].filter(Boolean).length;

  return (
    <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
      <Tabs defaultValue="operacional" className="space-y-4">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="operacional" className="gap-2 px-4 py-2">
            <Zap className="h-4 w-4" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="suporte" className="gap-2 px-4 py-2">
            <Headset className="h-4 w-4" />
            Suporte
            <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {openTicketsNow}
            </span>
          </TabsTrigger>
          <TabsTrigger value="sefaz" className="gap-2 px-4 py-2">
            <Activity className="h-4 w-4" />
            SEFAZ
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", sefazBadgeClasses[sefazHealth])}>
              {sefazBadgeLabels[sefazHealth]}
            </span>
          </TabsTrigger>
          {hasCadastrosAccess ? (
            <TabsTrigger value="cadastros" className="gap-2 px-4 py-2">
              <Building2 className="h-4 w-4" />
              Cadastros
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {cadastroTabsCount}
              </span>
            </TabsTrigger>
          ) : null}
          {canAccessCrm ? (
            <TabsTrigger value="comercial" className="gap-2 px-4 py-2">
              <Target className="h-4 w-4" />
              Comercial
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {data.crm?.activeLeads ?? 0}
              </span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="operacional">
          <OperacionalTab
            dailyPassword={data.dailyPassword}
            openTicketsNow={openTicketsNow}
            openTicketsWaiting={openTicketsWaiting}
            openTicketsInProgress={openTicketsInProgress}
            openTicketsSupport={openTicketsSupport}
            openTicketsDevelopment={openTicketsDevelopment}
            sefazHealth={sefazHealth}
            sefazRoutesCount={sefazRoutesCount}
            contracts={data.contracts}
          />
        </TabsContent>

        <TabsContent value="suporte">
          <SuporteTab
            openTicketRecords={data.openTicketRecords}
            tickets={data.tickets}
            totalOpen={data.totalOpen}
            activity={data.activity}
            scopeMode={scopeMode}
            allowAreaFilter={allowAreaFilter}
          />
        </TabsContent>

        <TabsContent value="sefaz">
          <SefazTab
            focusUfs={data.sefazFocusUfs ?? []}
            scopedStatuses={data.sefazStatuses ?? []}
            nationalStatuses={data.sefazNationalStatuses ?? []}
            configuredRoutes={data.sefazConfiguredRoutes ?? []}
            canViewAvailability={canViewAvailability}
          />
        </TabsContent>

        {hasCadastrosAccess ? (
          <TabsContent value="cadastros">
            <CadastrosTab
              canViewCompanies={canViewCompanies}
              canViewContacts={canViewContacts}
              canViewUsers={canViewUsers}
              companies={data.companies}
              recentContacts={data.recentContacts ?? []}
              recentUsers={data.recentUsers ?? []}
              cadastros={data.cadastros}
              companiesCount={data.companiesCount}
              contactsCount={data.contactsCount ?? 0}
              usersCount={data.usersCount}
            />
          </TabsContent>
        ) : null}

        {canAccessCrm ? (
          <TabsContent value="comercial">
            <ComercialTab contracts={data.contracts} crm={data.crm} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
