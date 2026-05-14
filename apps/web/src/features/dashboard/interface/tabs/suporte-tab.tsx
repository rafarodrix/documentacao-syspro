import { Suspense } from "react";
import { Headset, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { TabListSkeleton } from "../components/tab-skeleton";
import { SupportTicketsSubtab } from "./support-tickets-subtab";
import { SupportAtendimentosSubtab } from "./support-atendimentos-subtab";

const supportTabsClassName =
  "h-auto flex-wrap rounded-xl border border-border/50 bg-card/70 p-1 shadow-sm";

const supportTriggerClassName =
  "gap-2 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

export async function SuporteTab() {
  const canViewAtendimentos = await currentUserHasPermission(
    "dashboard:view_support_conversations",
    { acceptCompanyScope: true },
  );

  return (
    <Tabs defaultValue="tickets" className="space-y-4">
      <TabsList className={supportTabsClassName}>
        <TabsTrigger value="tickets" className={supportTriggerClassName}>
          <Ticket className="h-4 w-4" />
          Tickets
        </TabsTrigger>
        {canViewAtendimentos ? (
          <TabsTrigger value="atendimentos" className={supportTriggerClassName}>
            <Headset className="h-4 w-4" />
            Atendimentos
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="tickets">
        <Suspense fallback={<TabListSkeleton />}>
          <SupportTicketsSubtab />
        </Suspense>
      </TabsContent>

      {canViewAtendimentos ? (
        <TabsContent value="atendimentos">
          <Suspense fallback={<TabListSkeleton />}>
            <SupportAtendimentosSubtab />
          </Suspense>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
