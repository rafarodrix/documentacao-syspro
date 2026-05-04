import { DatabaseBackup, MonitorCog, Waypoints } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RemoteModuleSettingsForm } from "@/components/platform/app/settings/remote-module-settings-form";

type RemoteAccessSettingsTabProps = {
  companyOptions: Array<{ id: string; label: string; searchText?: string }>;
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
            Túnel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rustdesk" className="space-y-4">
          <RemoteModuleSettingsForm companyOptions={companyOptions} />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Módulo Backup</CardTitle>
              <CardDescription>
                Configurações globais do módulo de backup do Agente Trilink.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center">
                <DatabaseBackup className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">Em desenvolvimento</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As configurações de políticas, destinos e janelas operacionais de backup estarão disponíveis em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tunnel" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Módulo Túnel</CardTitle>
              <CardDescription>
                Parâmetros globais do módulo de túnel do Agente Trilink.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center">
                <Waypoints className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">Em desenvolvimento</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As configurações de endpoint, credenciais e políticas de exposição do túnel estarão disponíveis em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

