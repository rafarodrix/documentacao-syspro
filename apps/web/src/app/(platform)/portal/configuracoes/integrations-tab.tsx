"use client";

import { Bot, HardDrive, MessageSquare, Plug } from "lucide-react";
import { Tabs, TabsContent } from "@dosc-syspro/ui";
import EvolutionSettingsTab from "./evolution-tab";
import { SettingsPageIntro, SettingsTabsRail, SettingsTabsRailTrigger } from "./settings-shell";
import { ChatwootDiagnosticsTab } from "./integrations/components/chatwoot-tab";
import { StorageDiagnosticsTab } from "./integrations/components/storage-tab";

export function IntegrationsSettingsTab() {
  return (
    <div className="space-y-6">
      <SettingsPageIntro
        icon={Plug}
        eyebrow="Conectores"
        title="Integracoes"
        description="Centralize os conectores operacionais do portal em um fluxo unico de consulta, configuracao e diagnostico. Segredos continuam protegidos no backend e no runtime."
      />

      <Tabs defaultValue="chatwoot" className="space-y-5">
        <SettingsTabsRail className="sm:grid-cols-3">
          <SettingsTabsRailTrigger value="chatwoot" icon={MessageSquare} title="Chatwoot" />
          <SettingsTabsRailTrigger value="evolution" icon={Bot} title="Evolution" />
          <SettingsTabsRailTrigger value="storage" icon={HardDrive} title="Storage" />
        </SettingsTabsRail>

        <TabsContent value="chatwoot" className="focus-visible:ring-0">
          <ChatwootDiagnosticsTab />
        </TabsContent>

        <TabsContent value="evolution" className="focus-visible:ring-0">
          <EvolutionSettingsTab />
        </TabsContent>

        <TabsContent value="storage" className="focus-visible:ring-0">
          <StorageDiagnosticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
