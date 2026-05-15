import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth-helpers";
import {
  getSettingsAdminViewData,
  getSettingsRemoteAdminViewData,
} from "@/features/settings/application/settings-read.queries";
import { RemoteAccessSettingsTab } from "@/features/remote/interface/settings-tab";
import { TicketSettingsTab } from "@/features/tickets/interface/components/ticket-settings-tab";
import { MonthlyRoutineModuleSettingsTab } from "@/features/rotinas-mensais/interface/components/monthly-routine-module-settings-tab";
import { IntegrationsSettingsTab } from "./integrations-tab";
import {
  SettingsPageIntro,
  SettingsTabsRail,
  SettingsTabsRailTrigger,
} from "./settings-shell";

import { Tabs, TabsContent } from "@dosc-syspro/ui";
import {
  Settings,
  Sliders,
  Landmark,
  Activity,
  Files,
  Wallet,
  Boxes,
  Monitor,
  MessageSquare,
  Plug,
  Bot,
  CalendarRange,
  Blocks,
} from "lucide-react";

import {
  AutomationSettingsTab,
  GeneralSettingsForm,
  SefazRoutesTab,
} from "@/features/settings/interface";
import {
  SyncTaxAnexosButton,
  SyncTaxClassTribButton,
  SyncTaxCredPresumidoButton,
  SyncTaxNcmButton,
  TaxAnexosContainer,
  TaxClassificationList,
  TaxCredPresumidoContainer,
  TaxInterstateRatesTab,
  TaxNcmContainer,
  TaxSyncStatusBar,
} from "@/features/tax/interface";

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const TAB_VALUES = new Set([
  "general",
  "remote",
  "agent",
  "integrations",
  "automations",
  "modules",
  "monthly-routines",
  "access",
  "tax",
  "sefaz",
  "tickets",
]);

type SettingsViewData = Awaited<ReturnType<typeof getSettingsAdminViewData>>;

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  await requireSession();

  const params = searchParams ? await searchParams : undefined;
  const rawTab = typeof params?.tab === "string" ? params.tab : "general";
  const defaultModulesTab =
    rawTab === "tickets" ? "tickets" : rawTab === "monthly-routines" ? "monthly-routines" : "tickets";
  const defaultTab =
    rawTab === "remote"
      ? "agent"
      : rawTab === "tickets" || rawTab === "monthly-routines"
        ? "modules"
        : TAB_VALUES.has(rawTab)
          ? rawTab
          : "general";

  let settingsView: SettingsViewData;
  try {
    settingsView = await getSettingsAdminViewData();
  } catch {
    redirect("/portal");
  }

  const [remoteAdminViewResult] = await Promise.allSettled([
    getSettingsRemoteAdminViewData(),
  ]);
  const remoteAdminView =
    remoteAdminViewResult.status === "fulfilled"
      ? remoteAdminViewResult.value
      : { companyOptions: [] };
  const sefazRoutes = settingsView.sefazRoutes;
  const interstateIcmsSettings = settingsView.interstateIcmsSettings;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-8 px-6 pt-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <SettingsPageIntro
        icon={Sliders}
        eyebrow="Portal Admin"
        titleAs="h1"
        title="Configuracoes"
        description="Centralize preferencias, integracoes e modulos operacionais em uma unica area. A governanca global do Agente Trilink fica aqui; a operacao diaria de hosts, sessoes, relatorios e dispositivos continua em Infraestrutura."
      />

      <Tabs defaultValue={defaultTab} className="w-full min-w-0 space-y-6">
        <div className="flex items-center">
          <SettingsTabsRail className="sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
            <SettingsTabsRailTrigger
              value="general"
              icon={Settings}
              title="Preferencias"
            />

            <SettingsTabsRailTrigger
              value="agent"
              icon={Monitor}
              title="Agente Trilink"
            />

            <SettingsTabsRailTrigger
              value="integrations"
              icon={Plug}
              title="Integracoes"
            />

            <SettingsTabsRailTrigger
              value="automations"
              icon={Bot}
              title="Automacoes"
            />

            <SettingsTabsRailTrigger
              value="modules"
              icon={Blocks}
              title="Modulos"
            />

            <SettingsTabsRailTrigger
              value="tax"
              icon={Landmark}
              title="Fiscal e Tributario"
            />

            <SettingsTabsRailTrigger
              value="sefaz"
              icon={Activity}
              title="Rotas SEFAZ"
            />
          </SettingsTabsRail>
        </div>

        <TabsContent
          value="general"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            <GeneralSettingsForm adminView={settingsView.permissionsAdminView} />
          </div>
        </TabsContent>

        <TabsContent
          value="agent"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            {remoteAdminView ? (
              <RemoteAccessSettingsTab companyOptions={remoteAdminView.companyOptions} />
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
                Nao foi possivel carregar as configuracoes globais do modulo remoto.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="integrations"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            <IntegrationsSettingsTab />
          </div>
        </TabsContent>

        <TabsContent
          value="automations"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            <AutomationSettingsTab />
          </div>
        </TabsContent>

        <TabsContent
          value="modules"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            <Tabs defaultValue={defaultModulesTab} className="space-y-4">
              <SettingsTabsRail className="sm:grid-cols-2 xl:grid-cols-2">
                <SettingsTabsRailTrigger
                  value="tickets"
                  icon={MessageSquare}
                  title="Tickets"
                />
                <SettingsTabsRailTrigger
                  value="monthly-routines"
                  icon={CalendarRange}
                  title="Rotinas Mensais"
                />
              </SettingsTabsRail>

              <TabsContent value="tickets" className="space-y-4">
                <TicketSettingsTab />
              </TabsContent>

              <TabsContent value="monthly-routines" className="space-y-4">
                <MonthlyRoutineModuleSettingsTab />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="tax" className="min-w-0 space-y-4 overflow-x-hidden outline-none focus-visible:ring-0">
          <div className="max-w-6xl">
            <div className="mb-4 space-y-1">
              <h3 className="text-lg font-medium">Sincronizacao de Tabelas Fiscais</h3>
              <p className="text-sm text-muted-foreground">
                Subabas padronizadas por rota fiscal para acelerar manutencao e leitura.
              </p>
            </div>
            <TaxSyncStatusBar />

            <Tabs defaultValue="class-trib" className="space-y-4">
              <SettingsTabsRail className="sm:grid-cols-2 xl:grid-cols-5">
                <SettingsTabsRailTrigger
                  value="class-trib"
                  icon={Landmark}
                  title="Rota classTrib"
                />
                <SettingsTabsRailTrigger
                  value="anexos"
                  icon={Files}
                  title="Rota anexos"
                />
                <SettingsTabsRailTrigger
                  value="cred-presumido"
                  icon={Wallet}
                  title="Rota credPresumido"
                />
                <SettingsTabsRailTrigger
                  value="ncm"
                  icon={Boxes}
                  title="Rota NCM"
                />
                <SettingsTabsRailTrigger
                  value="interestadual"
                  icon={Landmark}
                  title="Interestadual"
                />
              </SettingsTabsRail>

              <TabsContent value="class-trib" className="space-y-4">
                <SyncTaxClassTribButton />
                <div className="mt-6">
                  <Suspense
                    fallback={
                      <div className="p-4 text-sm text-muted-foreground">
                        Carregando classTrib...
                      </div>
                    }
                  >
                    <TaxClassificationList />
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="anexos" className="space-y-4">
                <SyncTaxAnexosButton />
                <div className="mt-6">
                  <Suspense
                    fallback={
                      <div className="p-4 text-sm text-muted-foreground">
                        Carregando anexos...
                      </div>
                    }
                  >
                    <TaxAnexosContainer />
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="cred-presumido" className="space-y-4">
                <SyncTaxCredPresumidoButton />
                <div className="mt-6">
                  <Suspense
                    fallback={
                      <div className="p-4 text-sm text-muted-foreground">
                        Carregando credito presumido...
                      </div>
                    }
                  >
                    <TaxCredPresumidoContainer />
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="ncm" className="space-y-4">
                <SyncTaxNcmButton />
                <div className="mt-6">
                  <Suspense
                    fallback={
                      <div className="p-4 text-sm text-muted-foreground">
                        Carregando NCM...
                      </div>
                    }
                  >
                    <TaxNcmContainer />
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="interestadual" className="space-y-4">
                <TaxInterstateRatesTab initialRows={interstateIcmsSettings} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent
          value="sefaz"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            <SefazRoutesTab initialRoutes={sefazRoutes} />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
