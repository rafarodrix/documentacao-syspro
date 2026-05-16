"use client";

import { trpc } from "@/lib/api/trpc-client";
import type { MonthlyRoutineCompetencyListResponse } from "@dosc-syspro/contracts/rotinas-mensais";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@dosc-syspro/ui";
import { CalendarRange, CircleAlert, Eye, Filter, MessageSquareShare, RefreshCw, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MonthlyRoutineDetailsDialog } from "./monthly-routine-details-dialog";
import { MonthlyRoutineManualRequestDialog } from "./monthly-routine-manual-request-dialog";
import { MonthlyRoutineStatusDialog } from "./monthly-routine-status-dialog";

interface RotinasMensaisPageProps {
  competencies: MonthlyRoutineCompetencyListResponse;
  search: string;
  status: string;
  canManage: boolean;
}

function getCompetencyStatusLabel(status: MonthlyRoutineCompetencyListResponse["items"][number]["status"]) {
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

function getCompetencyStatusVariant(status: MonthlyRoutineCompetencyListResponse["items"][number]["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "OVERDUE":
      return "destructive" as const;
    case "SENT_TO_ACCOUNTING":
      return "info" as const;
    case "RECEIVED":
      return "warning" as const;
    case "WAITING_CUSTOMER":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function getManualRequestStatusLabel(status: MonthlyRoutineCompetencyListResponse["items"][number]["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "Enviado";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

function getManualRequestStatusVariant(status: MonthlyRoutineCompetencyListResponse["items"][number]["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "success" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Todas", countKey: "total" },
  { value: "PENDING", label: "Pendentes", countKey: "pending" },
  { value: "WAITING_CUSTOMER", label: "Aguardando cliente", countKey: "waitingCustomer" },
  { value: "RECEIVED", label: "Recebidas", countKey: "received" },
  { value: "SENT_TO_ACCOUNTING", label: "Enviadas", countKey: "sentToAccounting" },
  { value: "OVERDUE", label: "Atrasadas", countKey: "overdue" },
  { value: "COMPLETED", label: "Concluidas", countKey: "completed" },
] as const;

export function RotinasMensaisPage({ competencies, search, status, canManage }: RotinasMensaisPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const deferredSearch = useDeferredValue(searchDraft);
  const [selectedCompetency, setSelectedCompetency] = useState<MonthlyRoutineCompetencyListResponse["items"][number] | null>(null);
  const [selectedStatusCompetency, setSelectedStatusCompetency] = useState<MonthlyRoutineCompetencyListResponse["items"][number] | null>(null);
  const [selectedDetailsCompetencyId, setSelectedDetailsCompetencyId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    const normalizedCurrent = (searchParams.get("search") ?? "").trim();
    const normalizedNext = deferredSearch.trim();
    if (normalizedCurrent === normalizedNext) return;

    const handle = window.setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (normalizedNext) {
          params.set("search", normalizedNext);
        } else {
          params.delete("search");
        }
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [deferredSearch, pathname, router, searchParams]);

  const setStatusFilter = (nextStatus: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus && nextStatus !== "ALL") {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const hasActiveFilters = Boolean(search.trim()) || status !== "ALL";

  const handleSyncMonth = () => {
    startSyncTransition(async () => {
      try {
        const result = await trpc.rotinasMensais.syncCompetencies.mutate({
          year: competencies.year,
          month: competencies.month,
        });
        toast.success(`${result.message} ${result.generated} gerada(s), ${result.updated} atualizada(s).`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel sincronizar as competencias.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Rotinas Mensais</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Gerencie a fila mensal de documentos, disparos e andamento operacional.
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={handleSyncMonth} disabled={isSyncing} className="h-10 w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar competencias"}
            </Button>
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:w-auto">
            <div className="flex min-w-max rounded-md bg-muted/40 p-1">
              {STATUS_FILTER_OPTIONS.map((option) => {
                const count =
                  option.countKey === "total"
                    ? competencies.summary.total
                    : competencies.summary[option.countKey];
                const isActive = status === option.value || (status === "" && option.value === "ALL");

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-8 px-4 ${isActive ? "bg-background shadow-sm" : ""}`}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 w-full xl:w-auto">
            <div className="group relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Buscar por empresa, rotina, contato ou contador..."
                className="h-10 rounded-md border-border/60 bg-background pl-10 text-sm transition-all focus:border-primary/50 w-full"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchDraft("");
                    setStatusFilter("ALL");
                  }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Limpar
                </Button>
              ) : null}
              <Button
                type="button"
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowFilters((current) => !current)}
                aria-label="Mostrar filtros"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="mt-3 rounded-lg border border-border/40 bg-muted/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Competencia</p>
                <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-foreground">
                  {String(competencies.month).padStart(2, "0")}/{competencies.year}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Status atual</p>
                <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-foreground">
                  {status === "ALL"
                    ? "Todos"
                    : STATUS_FILTER_OPTIONS.find((option) => option.value === status)?.label || status}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Registros no recorte</p>
                <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-foreground">
                  {isPending ? "Atualizando..." : `${competencies.pagination.total} competencia(s)`}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>
            Competencias do mes {String(competencies.month).padStart(2, "0")}/{competencies.year}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Fila operacional gerada a partir das configuracoes ativas por empresa.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {competencies.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
              <CircleAlert className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">Nenhuma competencia gerada</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ative empresas na configuracao de rotina mensal para iniciar a fila do mes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/60">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Empresa</th>
                    <th className="px-3 py-3">Rotina</th>
                    <th className="px-3 py-3">Contato cliente</th>
                    <th className="px-3 py-3">Vencimento</th>
                    <th className="px-3 py-3">Checklist</th>
                    <th className="px-3 py-3">Solicitacoes</th>
                    <th className="px-3 py-3">Status</th>
                    {canManage ? <th className="px-3 py-3 text-right">Acoes</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {competencies.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-3 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{item.companyName}</div>
                          <div className="text-xs text-muted-foreground">{item.accountingFirmName || "Sem contador vinculado"}</div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {String(item.month).padStart(2, "0")}/{item.year}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-foreground">{item.clientContactName || "Nao definido"}</td>
                      <td className="px-3 py-4 text-sm text-foreground">
                        {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-4 text-sm text-foreground">
                        {item.requiredDocumentsCount} item(ns)
                      </td>
                      <td className="px-3 py-4">
                        {item.lastManualRequestAt ? (
                          <div className="space-y-1">
                            <Badge variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")}>
                              {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {item.lastManualRequestContactName || "Contato"} - {new Date(item.lastManualRequestAt).toLocaleString("pt-BR")}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.manualRequestsCount} envio(s)</div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem disparos manuais</span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <Badge variant={getCompetencyStatusVariant(item.status)}>
                          {getCompetencyStatusLabel(item.status)}
                        </Badge>
                      </td>
                      {canManage ? (
                        <td className="px-3 py-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mr-2"
                            onClick={() => setSelectedDetailsCompetencyId(item.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => setSelectedStatusCompetency(item)}
                          >
                            Atualizar status
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCompetency(item)}
                            disabled={item.availableContacts.length === 0}
                          >
                            <MessageSquareShare className="mr-2 h-4 w-4" />
                            {item.manualRequestsCount > 0 ? "Reenviar" : "Disparo manual"}
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MonthlyRoutineManualRequestDialog
        item={selectedCompetency}
        open={Boolean(selectedCompetency)}
        onOpenChange={(open) => {
          if (!open) setSelectedCompetency(null);
        }}
        onSent={() => router.refresh()}
      />

      <MonthlyRoutineStatusDialog
        item={selectedStatusCompetency}
        open={Boolean(selectedStatusCompetency)}
        onOpenChange={(open) => {
          if (!open) setSelectedStatusCompetency(null);
        }}
        onSaved={() => router.refresh()}
      />

      <MonthlyRoutineDetailsDialog
        itemId={selectedDetailsCompetencyId}
        open={Boolean(selectedDetailsCompetencyId)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailsCompetencyId(null);
        }}
      />
    </div>
  );
}
