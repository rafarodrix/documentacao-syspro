import { DatabaseBackup, MonitorCog, Waypoints } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RemoteModuleSettingsForm } from "@/components/platform/app/settings/RemoteModuleSettingsForm";

type RemoteAccessSettingsTabProps = {
  companyOptions: Array<{ id: string; label: string }>;
};

export function RemoteAccessSettingsTab({ companyOptions }: RemoteAccessSettingsTabProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="rustdesk" className="space-y-4">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="rustdesk" className="gap-2 px-4 py-2">
            <MonitorCog className="h-4 w-4" />
            Remoto
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2 px-4 py-2">
            <DatabaseBackup className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="tunnel" className="gap-2 px-4 py-2">
            <Waypoints className="h-4 w-4" />
            Tunel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rustdesk" className="space-y-4">
          <RemoteModuleSettingsForm companyOptions={companyOptions} />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Modulo Backup</CardTitle>
              <CardDescription>
                Esta subaba vai receber as configuracoes globais do modulo de backup do Agente Trilink.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                O agente ja possui modulo de backup no runtime, mas esta tela ainda nao expõe politicas, destinos e janelas operacionais.
              </div>
              <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4">
                Proximo corte recomendado: storage provider, retention, cronela de execucao e observabilidade de jobs.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tunnel" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Modulo Tunel</CardTitle>
              <CardDescription>
                Esta subaba vai concentrar os parametros globais do tunel do Agente Trilink.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                O modulo existe no agente, mas a governanca de produto ainda nao esta modelada nesta area administrativa.
              </div>
              <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4">
                Proximo corte recomendado: endpoint, credenciais, politicas de exposicao e regras de auditoria.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

