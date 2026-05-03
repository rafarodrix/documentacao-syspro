import type { LucideIcon } from "lucide-react";
import { DatabaseBackup, MonitorCog, Waypoints } from "lucide-react";
import {
  SettingsMetricCard,
  SettingsPageIntro,
  SettingsTabsRail,
  SettingsTabsRailTrigger,
} from "@/app/(platform)/portal/configuracoes/settings-shell";
import { RemoteModuleSettingsForm } from "@/components/platform/app/settings/RemoteModuleSettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";

type RemoteAccessSettingsTabProps = {
  companyOptions: Array<{ id: string; label: string; searchText?: string }>;
};

export function RemoteAccessSettingsTab({ companyOptions }: RemoteAccessSettingsTabProps) {
  return (
    <div className="space-y-6">
      <SettingsPageIntro
        icon={MonitorCog}
        eyebrow="Agente Trilink"
        title="Modulos operacionais"
        description="Padronize os modulos do agente em uma navegacao unica. A operacao continua separada por remoto, backup e tunel, mas agora segue a mesma linguagem visual das demais configuracoes."
        aside={
          <div className="grid gap-3 md:grid-cols-3">
            <SettingsMetricCard
              label="Remoto"
              value="Ativo"
              helper="Governanca global do acesso remoto e provisionamento."
            />
            <SettingsMetricCard
              label="Backup"
              value="Roadmap"
              helper="Espaco reservado para politicas, destinos e janelas."
            />
            <SettingsMetricCard
              label="Tunel"
              value="Roadmap"
              helper="Reservado para endpoints, credenciais e exposicao."
            />
          </div>
        }
      />

      <Tabs defaultValue="rustdesk" className="space-y-4">
        <SettingsTabsRail className="sm:grid-cols-3">
          <SettingsTabsRailTrigger
            value="rustdesk"
            icon={MonitorCog}
            title="Remoto"
            description="Configuracoes globais do modulo de acesso remoto."
          />
          <SettingsTabsRailTrigger
            value="backup"
            icon={DatabaseBackup}
            title="Backup"
            description="Politicas de protecao e execucao futura."
          />
          <SettingsTabsRailTrigger
            value="tunnel"
            icon={Waypoints}
            title="Tunel"
            description="Conectividade segura e exposicao controlada."
          />
        </SettingsTabsRail>

        <TabsContent value="rustdesk" className="space-y-4">
          <RemoteModuleSettingsForm companyOptions={companyOptions} />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <RoadmapCard
            icon={DatabaseBackup}
            title="Modulo Backup"
            description="Configuracoes globais do modulo de backup do Agente Trilink."
            body="As configuracoes de politicas, destinos e janelas operacionais de backup estarao disponiveis em breve."
          />
        </TabsContent>

        <TabsContent value="tunnel" className="space-y-4">
          <RoadmapCard
            icon={Waypoints}
            title="Modulo Tunel"
            description="Parametros globais do modulo de tunel do Agente Trilink."
            body="As configuracoes de endpoint, credenciais e politicas de exposicao do tunel estarao disponiveis em breve."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoadmapCard({
  icon: Icon,
  title,
  description,
  body,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  body: string;
}) {
  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8 text-center">
          <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Em desenvolvimento</p>
          <p className="mt-1 text-xs text-muted-foreground">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}
