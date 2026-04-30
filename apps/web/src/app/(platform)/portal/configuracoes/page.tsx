import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth-helpers";
import {
  getSettingsAdminViewData,
  getSettingsRemoteAdminViewData,
} from "@/features/settings/application/queries";
import { RemoteAccessSettingsTab } from "@/features/remote/interface/settings-tab";
import { TicketSettingsTab } from "@/features/tickets/interface/components/ticket-settings-tab";
import { IntegrationsSettingsTab } from "./integrations-tab";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const defaultTab =
    rawTab === "remote" ? "agent" : TAB_VALUES.has(rawTab) ? rawTab : "general";

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
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <Sliders className="h-8 w-8 text-primary/80" />
          Configuracoes
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Gerencie parametros globais do sistema. A aba Agente Trilink cobre a
          governanca global dos modulos do agente; a operacao de hosts, sessoes,
          relatorios e dispositivos continua em Infraestrutura.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full min-w-0 space-y-6">
        <div className="flex items-center">
          <TabsList className="h-auto flex-wrap border border-border/40 bg-muted/50 p-1">
            <TabsTrigger
              value="general"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium">Preferencias</span>
            </TabsTrigger>

            <TabsTrigger
              value="agent"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Monitor className="h-4 w-4" />
              <span className="font-medium">Agente Trilink</span>
            </TabsTrigger>

            <TabsTrigger
              value="integrations"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Plug className="h-4 w-4" />
              <span className="font-medium">Integracoes</span>
            </TabsTrigger>

            <TabsTrigger
              value="automations"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Bot className="h-4 w-4" />
              <span className="font-medium">Automacoes</span>
            </TabsTrigger>

            <TabsTrigger
              value="tax"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Landmark className="h-4 w-4" />
              <span className="font-medium">Fiscal e Tributario</span>
            </TabsTrigger>

            <TabsTrigger
              value="sefaz"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Activity className="h-4 w-4" />
              <span className="font-medium">Rotas SEFAZ</span>
            </TabsTrigger>

            <TabsTrigger
              value="tickets"
              className="gap-2 px-6 py-2 transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Tickets</span>
            </TabsTrigger>
          </TabsList>
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

        <TabsContent value="tax" className="min-w-0 space-y-4 overflow-x-hidden outline-none focus-visible:ring-0">
          <div className="max-w-6xl">
            <h3 className="mb-4 text-lg font-medium">
              Sincronizacao de Tabelas Fiscais
            </h3>
            <TaxSyncStatusBar />

            <Tabs defaultValue="class-trib" className="space-y-4">
              <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
                <TabsTrigger value="class-trib" className="gap-2 px-4 py-2">
                  <Landmark className="h-4 w-4" />
                  Rota classTrib
                </TabsTrigger>
                <TabsTrigger value="anexos" className="gap-2 px-4 py-2">
                  <Files className="h-4 w-4" />
                  Rota anexos
                </TabsTrigger>
                <TabsTrigger value="cred-presumido" className="gap-2 px-4 py-2">
                  <Wallet className="h-4 w-4" />
                  Rota credPresumido
                </TabsTrigger>
                <TabsTrigger value="ncm" className="gap-2 px-4 py-2">
                  <Boxes className="h-4 w-4" />
                  Rota NCM
                </TabsTrigger>
                <TabsTrigger value="interestadual" className="gap-2 px-4 py-2">
                  <Landmark className="h-4 w-4" />
                  Interestadual
                </TabsTrigger>
              </TabsList>

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

        <TabsContent
          value="tickets"
          className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus-visible:ring-0"
        >
          <div className="max-w-6xl">
            <TicketSettingsTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
