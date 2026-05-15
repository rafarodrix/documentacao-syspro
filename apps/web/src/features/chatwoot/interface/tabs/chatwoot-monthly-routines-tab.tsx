"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MonthlyRoutineCompetencyItem } from "@dosc-syspro/contracts/rotinas-mensais";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { CalendarClock, CircleCheckBig, Loader2, MessageSquareShare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc-client";
import { MonthlyRoutineManualRequestDialog } from "@/features/rotinas-mensais/interface/components/monthly-routine-manual-request-dialog";
import { MonthlyRoutineStatusDialog } from "@/features/rotinas-mensais/interface/components/monthly-routine-status-dialog";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import { ContextBadge, EmptyState, InlineLoading, InlineWarning } from "../chatwoot-dashboard-ui";

function getRoutineStatusLabel(status: MonthlyRoutineCompetencyItem["status"]) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "WAITING_CUSTOMER":
      return "Aguardando cliente";
    case "RECEIVED":
      return "Recebido";
    case "SENT_TO_ACCOUNTING":
      return "Enviado para contabilidade";
    case "COMPLETED":
      return "Concluido";
    case "OVERDUE":
      return "Atrasado";
    case "CANCELED":
      return "Cancelado";
    default:
      return status;
  }
}

function getRoutineStatusTone(status: MonthlyRoutineCompetencyItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return "good" as const;
    case "OVERDUE":
      return "warn" as const;
    default:
      return "neutral" as const;
  }
}

function getRequestStatusLabel(status: MonthlyRoutineCompetencyItem["lastManualRequestStatus"]) {
  switch (status) {
    case "SENT":
      return "Ultimo envio concluido";
    case "FAILED":
      return "Ultimo envio falhou";
    default:
      return "Sem disparo";
  }
}

export function ChatwootMonthlyRoutinesTab() {
  const { resolved, effectiveContactName, linkedCompanies } = useChatwootDashboard();
  const [items, setItems] = useState<MonthlyRoutineCompetencyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedManualItem, setSelectedManualItem] = useState<MonthlyRoutineCompetencyItem | null>(null);
  const [selectedStatusItem, setSelectedStatusItem] = useState<MonthlyRoutineCompetencyItem | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const competenceLabel = `${String(currentMonth).padStart(2, "0")}/${currentYear}`;
  const hasMultipleLinkedCompanies = linkedCompanies.length > 1;
  const needsContextSelection = hasMultipleLinkedCompanies && !resolved.companyId;

  useEffect(() => {
    if (!resolved.companyId) {
      setItems([]);
      setError(null);
      return;
    }

    let active = true;
    async function loadItems() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await trpc.rotinasMensais.listCompetencies.query({
          page: "1",
          pageSize: "100",
          year: String(currentYear),
          month: String(currentMonth),
          status: "ALL",
        });

        if (!active) return;

        const nextItems = response.items
          .filter((item) => item.companyId === resolved.companyId)
          .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));

        setItems(nextItems);
      } catch (nextError) {
        if (!active) return;
        setItems([]);
        setError(nextError instanceof Error ? nextError.message : "Nao foi possivel carregar as rotinas mensais.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();
    return () => {
      active = false;
    };
  }, [currentMonth, currentYear, reloadToken, resolved.companyId]);

  const openManualRequest = (item: MonthlyRoutineCompetencyItem) => {
    setSelectedManualItem(item);
  };

  const openStatusDialog = (item: MonthlyRoutineCompetencyItem) => {
    setSelectedStatusItem(item);
  };

  const handleRefresh = () => {
    setReloadToken((current) => current + 1);
  };

  const handleSync = () => {
    startSyncTransition(async () => {
      try {
        await trpc.rotinasMensais.syncCompetencies.mutate({
          year: currentYear,
          month: currentMonth,
        });
        toast.success("Competencias sincronizadas para a empresa em contexto.");
        handleRefresh();
      } catch (nextError) {
        toast.error(nextError instanceof Error ? nextError.message : "Nao foi possivel sincronizar as competencias.");
      }
    });
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-4 w-4 text-primary" />
                Rotinas mensais
              </CardTitle>
              <CardDescription>
                Solicite documentos e finalize a competencia do mes sem sair do Chatwoot.
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
                Atualizar
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleSync} disabled={!resolved.companyId || isSyncing}>
                {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {resolved.companyName || (needsContextSelection ? "Selecionar empresa" : "Sem vinculo")}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contato</p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{effectiveContactName || "Nao identificado"}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Competencia</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{competenceLabel}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rotinas</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{items.length} em contexto</p>
            </div>
          </div>

          {needsContextSelection ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-700 dark:text-amber-300">
              <span>Este contato possui mais de uma empresa vinculada. Escolha a empresa em contexto no topo do painel para operar a rotina correta.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Ver seletor
              </Button>
            </div>
          ) : null}

          {!resolved.companyId && !needsContextSelection ? (
            <InlineWarning message="Vincule ou selecione uma empresa para habilitar as rotinas mensais desta conversa." />
          ) : null}

          {isLoading ? <InlineLoading label="Carregando rotinas mensais da empresa..." /> : null}
          {error ? <InlineWarning message={error} /> : null}

          {!isLoading && !error && resolved.companyId && items.length === 0 ? (
            <EmptyState label="Nenhuma rotina mensal encontrada para a empresa em contexto nesta competencia." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <ContextBadge tone={getRoutineStatusTone(item.status)}>
                          {getRoutineStatusLabel(item.status)}
                        </ContextBadge>
                        <Badge variant="outline">Vence em {new Date(item.dueDate).toLocaleDateString("pt-BR")}</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contato cliente</p>
                          <p className="mt-1 text-xs font-medium text-foreground">{item.clientContactName || "Nao definido"}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contabilidade</p>
                          <p className="mt-1 text-xs font-medium text-foreground">{item.accountingFirmName || "Nao vinculada"}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Envios</p>
                          <p className="mt-1 text-xs font-medium text-foreground">{item.manualRequestsCount} registrado(s)</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ultimo disparo</p>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {item.lastManualRequestAt ? new Date(item.lastManualRequestAt).toLocaleString("pt-BR") : "Sem envio"}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getRequestStatusLabel(item.lastManualRequestStatus)}
                        {item.lastManualRequestContactName ? ` com ${item.lastManualRequestContactName}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" size="sm" className="gap-1.5" onClick={() => openManualRequest(item)}>
                        <MessageSquareShare className="h-3.5 w-3.5" />
                        {item.manualRequestsCount > 0 ? "Reenviar" : "Enviar mensagem"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => openStatusDialog(item)}>
                        <CircleCheckBig className="h-3.5 w-3.5" />
                        Finalizar / status
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <MonthlyRoutineManualRequestDialog
        item={selectedManualItem}
        open={selectedManualItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedManualItem(null);
          }
        }}
        onSent={handleRefresh}
      />

      <MonthlyRoutineStatusDialog
        item={selectedStatusItem}
        open={selectedStatusItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStatusItem(null);
          }
        }}
        onSaved={handleRefresh}
      />
    </>
  );
}
