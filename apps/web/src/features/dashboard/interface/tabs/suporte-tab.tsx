import { Suspense } from "react";
import { Headset, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { TabListSkeleton } from "../components/tab-skeleton";
import { SupportTicketsSubtab } from "./support-tickets-subtab";
import { SupportAtendimentosSubtab } from "./support-atendimentos-subtab";

export async function SuporteTab() {
  const canViewAtendimentos = await currentUserHasPermission(
    "dashboard:view_support_conversations",
    { acceptCompanyScope: true },
  );

  return (
    <Tabs defaultValue="tickets" className="space-y-4">
      <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
        <TabsTrigger value="tickets" className="gap-2 px-4 py-2">
          <Ticket className="h-4 w-4" />
          Tickets
        </TabsTrigger>
        {canViewAtendimentos ? (
          <TabsTrigger value="atendimentos" className="gap-2 px-4 py-2">
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
