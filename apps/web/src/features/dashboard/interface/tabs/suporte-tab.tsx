import { Suspense } from "react";
import { ClipboardList, Headset, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { TabListSkeleton } from "../components/tab-skeleton";
import { SupportTicketsSubtab } from "./support-tickets-subtab";
import { SupportAtendimentosSubtab } from "./support-atendimentos-subtab";
import { SupportTarefasSubtab } from "./support-tarefas-subtab";

const supportTabsClassName =
  "h-auto flex-wrap rounded-lg border border-border/50 bg-card p-1";

const supportTriggerClassName =
  "gap-2 rounded-md px-3.5 py-2 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground";

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
        <TabsTrigger value="tarefas" className={supportTriggerClassName}>
          <ClipboardList className="h-4 w-4" />
          Tarefas
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

      <TabsContent value="tarefas">
        <Suspense fallback={<TabListSkeleton />}>
          <SupportTarefasSubtab />
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
