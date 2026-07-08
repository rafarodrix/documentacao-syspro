import { Suspense } from "react";
import { ClipboardList, Headset, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { TabListSkeleton } from "../components/tab-skeleton";
import { ExecutiveSummaryCard } from "../components/executive-summary-card";
import { ExecutiveLine } from "../components/executive-line";
import { DashboardNextActionCard } from "../components/dashboard-next-action-card";
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
    <div className="space-y-5">
      <ExecutiveSummaryCard
        title="Leitura executiva do suporte"
        description="Comece por tickets, confirme prazos em tarefas e finalize em atendimentos. A leitura precisa mostrar risco de fila, atraso e dono antes do detalhe."
      >
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <ExecutiveLine label="Tickets" value="Fila, prioridade e modulo" />
          <ExecutiveLine label="Tarefas" value="Prazos, atraso e retorno" />
          <ExecutiveLine
            label="Atendimentos"
            value={canViewAtendimentos ? "Carga, dono e CSAT" : "Sem permissao"}
            emphasis={canViewAtendimentos ? "text-foreground" : "font-bold text-amber-500"}
          />
        </div>
      </ExecutiveSummaryCard>

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

      <DashboardNextActionCard
        description="Feche a leitura abrindo a frente com maior risco agora e registre um novo ticket apenas quando a demanda ainda nao estiver na fila."
        primaryHref="/portal/tickets"
        primaryLabel="Ir para suporte"
        secondaryHref="/portal/tickets/novo"
        secondaryLabel="Abrir novo ticket"
      />
    </div>
  );
}
