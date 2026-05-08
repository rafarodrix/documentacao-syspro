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

export function AdminDashboard({
  role,
  canAccessCrm,
  canViewAvailability,
}: {
  role: string;
  canAccessCrm: boolean;
  canViewAvailability: boolean;
}) {
  const isDeveloper = role === "DEVELOPER";

  return (
    <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
      <AdminStatusBar role={role} />
      <Tabs defaultValue="operacional" className="space-y-4">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="operacional" className="gap-2 px-4 py-2">
            <Zap className="h-4 w-4" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="suporte" className="gap-2 px-4 py-2">
            <Headset className="h-4 w-4" />
            Suporte
          </TabsTrigger>
          <TabsTrigger value="sefaz" className="gap-2 px-4 py-2">
            <Activity className="h-4 w-4" />
            SEFAZ
          </TabsTrigger>
          {!isDeveloper ? (
            <TabsTrigger value="cadastros" className="gap-2 px-4 py-2">
              <Building2 className="h-4 w-4" />
              Cadastros
            </TabsTrigger>
          ) : null}
          {canAccessCrm ? (
            <TabsTrigger value="comercial" className="gap-2 px-4 py-2">
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

        {!isDeveloper ? (
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
