"use client";

import Link from "next/link";
import { DashboardPriorityQueueItem } from "@dosc-syspro/contracts/dashboard";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { AlertCircle, ExternalLink, ShieldAlert, UserCheck, UserX } from "lucide-react";

type SupportPriorityQueueTableProps = {
  items: DashboardPriorityQueueItem[];
  unassignedConversationsFallback?: Array<{
    id: string;
    reference: string;
    subject: string;
    contactName: string;
    channel: "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE";
    status: string;
    lastUpdate: string;
    detailHref: string;
  }>;
};

function formatWaitTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ""}`;
}

export function SupportPriorityQueueTable({
  items,
  unassignedConversationsFallback = [],
}: SupportPriorityQueueTableProps) {
  const displayItems = items.length > 0
    ? items
    : unassignedConversationsFallback.map((conv) => ({
        id: conv.id,
        reference: conv.reference,
        subject: conv.subject,
        companyName: conv.contactName,
        assigneeName: "Sem responsável",
        assigneeId: null,
        waitTimeMinutes: Math.floor((Date.now() - new Date(conv.lastUpdate).getTime()) / 60000),
        slaStatus: "AT_RISK" as const,
        statusLabel: conv.status,
        priority: "HIGH" as const,
        channel: conv.channel,
        createdAt: conv.lastUpdate,
        detailHref: conv.detailHref,
      }));

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-base font-semibold text-foreground">
              Fila Prioritária Exigindo Ação
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Conversas ordenadas por violação de SLA, risco operacional e ausência de atribuição.
          </p>
        </div>
        <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs w-fit">
          {displayItems.length} pendências prioritárias
        </Badge>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {displayItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <UserCheck className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
            Nenhuma conversa crítica ou pendente de ação na fila.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Prioridade</th>
                  <th className="px-4 py-2.5 font-semibold">Conversa / Assunto</th>
                  <th className="px-4 py-2.5 font-semibold">Empresa / Contato</th>
                  <th className="px-4 py-2.5 font-semibold">Responsável</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Espera</th>
                  <th className="px-4 py-2.5 font-semibold">SLA</th>
                  <th className="px-4 py-2.5 font-semibold">Canal</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {displayItems.map((item) => {
                  const isUnassigned = !item.assigneeId || item.assigneeName === "Sem responsável";
                  const isBreached = item.slaStatus === "BREACHED";
                  const isAtRisk = item.slaStatus === "AT_RISK";

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isBreached ? (
                          <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">Crítica</Badge>
                        ) : isAtRisk ? (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Alta</Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground max-w-[240px] truncate" title={item.subject}>
                          {item.subject}
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          Ref: {item.reference}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate" title={item.companyName}>
                        {item.companyName}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                            <UserX className="h-3 w-3" />
                            Sem responsável
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{item.assigneeName}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground whitespace-nowrap">
                        {formatWaitTime(item.waitTimeMinutes)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isBreached ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500">
                            <AlertCircle className="h-3 w-3" /> Violado
                          </span>
                        ) : isAtRisk ? (
                          <span className="text-xs font-medium text-amber-400">Em risco</span>
                        ) : (
                          <span className="text-xs text-emerald-400">Normal</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {item.channel}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link href={item.detailHref}>
                            Atender
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
