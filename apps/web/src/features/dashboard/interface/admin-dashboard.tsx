import { Suspense } from "react";
import { Activity, Building2, Headset, Target, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { OperacionalTab } from "./tabs/operacional-tab";
import { SuporteTab } from "./tabs/suporte-tab";
import { SefazTab } from "./tabs/sefaz-tab";
import { CadastrosTab } from "./tabs/cadastros-tab";
import { ComercialTab } from "./tabs/comercial-tab";
import { TabSkeleton, TabListSkeleton } from "./components/tab-skeleton";
import { AdminStatusBar } from "./components/admin-status-bar";
import type { AdminOperacionalData } from "@dosc-syspro/contracts/dashboard";

const primaryTabsClassName =
  "h-auto flex-wrap rounded-lg border border-border/50 bg-card p-1";

const primaryTriggerClassName =
  "gap-2 rounded-md px-3.5 py-2 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground";

export function AdminDashboard({
  canAccessCrm,
  canAccessCadastros,
  canViewAvailability,
  statusSummary,
}: {
  canAccessCrm: boolean;
  canAccessCadastros: boolean;
  canViewAvailability: boolean;
  statusSummary: Pick<AdminOperacionalData, "ticketCounts" | "sefazHealth" | "sefazRoutesCount">;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
      <AdminStatusBar summary={statusSummary} />
      <Tabs defaultValue="operacional" className="space-y-4">
        <TabsList className={primaryTabsClassName}>
          <TabsTrigger value="operacional" className={primaryTriggerClassName}>
            <Zap className="h-4 w-4" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="suporte" className={primaryTriggerClassName}>
            <Headset className="h-4 w-4" />
            Suporte
          </TabsTrigger>
          <TabsTrigger value="sefaz" className={primaryTriggerClassName}>
            <Activity className="h-4 w-4" />
            SEFAZ
          </TabsTrigger>
          {canAccessCadastros ? (
            <TabsTrigger value="cadastros" className={primaryTriggerClassName}>
              <Building2 className="h-4 w-4" />
              Cadastros
            </TabsTrigger>
          ) : null}
          {canAccessCrm ? (
            <TabsTrigger value="comercial" className={primaryTriggerClassName}>
              <Target className="h-4 w-4" />
              Comercial
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="operacional">
          <Suspense fallback={<TabSkeleton cards={8} />}>
            <OperacionalTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="suporte">
          <Suspense fallback={<TabListSkeleton />}>
            <SuporteTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="sefaz">
          <Suspense fallback={<TabSkeleton cards={2} />}>
            <SefazTab canViewAvailability={canViewAvailability} />
          </Suspense>
        </TabsContent>

        {canAccessCadastros ? (
          <TabsContent value="cadastros">
            <Suspense fallback={<TabListSkeleton />}>
              <CadastrosTab />
            </Suspense>
          </TabsContent>
        ) : null}

        {canAccessCrm ? (
          <TabsContent value="comercial">
            <Suspense fallback={<TabListSkeleton />}>
              <ComercialTab />
            </Suspense>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
