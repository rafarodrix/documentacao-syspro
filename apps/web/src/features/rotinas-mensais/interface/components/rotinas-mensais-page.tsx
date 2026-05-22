"use client";

import Link from "next/link";
import { trpc } from "@/lib/api/trpc-client";
import type { MonthlyRoutineCompetencyListResponse, MonthlyRoutineListResponse } from "@dosc-syspro/contracts/rotinas-mensais";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, Input } from "@dosc-syspro/ui";
import { Building2, CalendarRange, CircleAlert, MessageSquareShare, RefreshCw, Search, Settings2, UsersRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDateShort, formatDateTime } from "@/lib/date";
import { MonthlyRoutineManualRequestDialog } from "./monthly-routine-manual-request-dialog";
import { MonthlyRoutineStatusDialog } from "./monthly-routine-status-dialog";
import { type ColumnDef } from "@tanstack/react-table";

interface RotinasMensaisPageProps {
  data: MonthlyRoutineListResponse;
  competencies: MonthlyRoutineCompetencyListResponse;
  search: string;
  canManage: boolean;
}

function getStatusLabel(status: MonthlyRoutineListResponse["items"][number]["candidateStatus"]) {
  switch (status) {
    case "READY_TO_CONFIGURE":
      return "Pronta para configurar";
    case "NO_ACCOUNTING_FIRM":
      return "Sem contador";
    case "NO_PRIMARY_CONTACT":
      return "Sem contato principal";
    default:
      return status;
  }
}

function getStatusVariant(status: MonthlyRoutineListResponse["items"][number]["candidateStatus"]) {
  switch (status) {
    case "READY_TO_CONFIGURE":
      return "default" as const;
    case "NO_ACCOUNTING_FIRM":
      return "destructive" as const;
    case "NO_PRIMARY_CONTACT":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
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

export function RotinasMensaisPage({ data, competencies, search, canManage }: RotinasMensaisPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const deferredSearch = useDeferredValue(searchDraft);
  const [selectedCompetency, setSelectedCompetency] = useState<MonthlyRoutineCompetencyListResponse["items"][number] | null>(null);
  const [selectedStatusCompetency, setSelectedStatusCompetency] = useState<MonthlyRoutineCompetencyListResponse["items"][number] | null>(null);

  const competencyColumns = useMemo<ColumnDef<MonthlyRoutineCompetencyListResponse["items"][number]>[]>(() => {
    const cols: ColumnDef<MonthlyRoutineCompetencyListResponse["items"][number]>[] = [
      {
        accessorKey: "companyName",
        header: "Empresa",
        meta: { className: "w-[20%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium text-foreground">{item.companyName}</div>
              <div className="text-xs text-muted-foreground">{item.accountingFirmName || "Sem contador vinculado"}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Rotina",
        meta: { className: "w-[18%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {String(item.month).padStart(2, "0")}/{item.year}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "clientContactName",
        header: "Contato cliente",
        meta: { className: "w-[15%] px-3 py-3.5 text-sm text-foreground hidden lg:table-cell" },
        cell: ({ row }) => row.original.clientContactName || "Não definido",
      },
      {
        accessorKey: "dueDate",
        header: "Vencimento",
        meta: { className: "w-[10%] px-3 py-3.5 text-sm text-foreground whitespace-nowrap" },
        cell: ({ row }) => formatDateShort(row.original.dueDate),
      },
      {
        accessorKey: "requiredDocumentsCount",
        header: "Checklist",
        meta: { className: "w-[10%] px-3 py-3.5 text-sm text-foreground whitespace-nowrap hidden xl:table-cell" },
        cell: ({ row }) => `${row.original.requiredDocumentsCount} item(ns)`,
      },
      {
        id: "requests",
        header: "Solicitações",
        meta: { className: "w-[17%] px-3 py-3.5 hidden lg:table-cell" },
        cell: ({ row }) => {
          const item = row.original;
          return item.lastManualRequestAt ? (
            <div className="space-y-1">
              <Badge variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")}>
                {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {item.lastManualRequestContactName || "Contato"} - {formatDateTime(item.lastManualRequestAt)}
              </div>
              <div className="text-xs text-muted-foreground">{item.manualRequestsCount} envio(s)</div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sem disparos manuais</span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { className: "w-[10%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Badge variant={getCompetencyStatusVariant(item.status)}>
              {getCompetencyStatusLabel(item.status)}
            </Badge>
          );
        },
      },
    ];

    if (canManage) {
      cols.push({
        id: "actions",
        header: "Ações",
        meta: { className: "w-[15%] px-3 py-3.5 text-right" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div 
              className="flex flex-col items-end gap-2 xl:flex-row xl:justify-end"
              onDoubleClick={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSelectedStatusCompetency(item)}
              >
                Atualizar status
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSelectedCompetency(item)}
                disabled={item.availableContacts.length === 0}
              >
                <MessageSquareShare className="mr-2 h-4 w-4" />
                {item.manualRequestsCount > 0 ? "Reenviar" : "Disparo manual"}
              </Button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [canManage]);

  const configColumns = useMemo<ColumnDef<MonthlyRoutineListResponse["items"][number]>[]>(() => {
    return [
      {
        accessorKey: "companyName",
        header: "Empresa",
        meta: { className: "w-[30%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="font-medium text-foreground">{item.companyTradeName || item.companyName}</div>
                <div className="text-sm text-muted-foreground">{item.companyName}</div>
                <Link
                  href={`/portal/cadastros/empresa/${item.companyId}/editar`}
                  className="inline-flex text-xs font-medium text-primary hover:underline"
                >
                  Abrir cadastro da empresa
                </Link>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "accountingFirmName",
        header: "Contador",
        meta: { className: "w-[25%] px-3 py-3.5 text-sm text-foreground hidden lg:table-cell" },
        cell: ({ row }) => {
          const item = row.original;
          return item.accountingFirmName ? (
            <div className="space-y-1">
              <div>{item.accountingFirmName}</div>
              {item.accountingFirmId ? (
                <Link
                  href={`/portal/cadastros/empresa/${item.accountingFirmId}/editar`}
                  className="inline-flex text-xs font-medium text-primary hover:underline"
                >
                  Abrir cadastro do contador
                </Link>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground">Não vinculado</span>
          );
        },
      },
      {
        accessorKey: "primaryContactName",
        header: "Contato",
        meta: { className: "w-[25%] px-3 py-3.5 text-sm text-foreground hidden md:table-cell" },
        cell: ({ row }) => {
          const item = row.original;
          return item.primaryContactName ? (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <UsersRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {item.primaryContactName}
              </div>
              <div className="text-xs text-muted-foreground">{item.primaryContactEmail || "Sem email principal"}</div>
              <div className="text-xs text-muted-foreground">{item.contactsCount} contato(s) vinculado(s)</div>
            </div>
          ) : (
            <span className="text-muted-foreground">Nenhum contato principal</span>
          );
        },
      },
      {
        accessorKey: "taxRegime",
        header: "Regime",
        meta: { className: "w-[12%] px-3 py-3.5 text-sm text-foreground hidden xl:table-cell" },
        cell: ({ row }) => {
          const item = row.original;
          return item.taxRegime ? (
            item.taxRegime.replaceAll("_", " ")
          ) : (
            <span className="text-muted-foreground">Não definido</span>
          );
        },
      },
      {
        accessorKey: "candidateStatus",
        header: "Status",
        meta: { className: "w-[8%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Badge variant={getStatusVariant(item.candidateStatus)}>
              {getStatusLabel(item.candidateStatus)}
            </Badge>
          );
        },
      },
    ];
  }, []);

  const renderMobileCompetency = useCallback(
    (item: MonthlyRoutineCompetencyListResponse["items"][number]) => (
      <div className="flex flex-col p-4 gap-3 bg-card/40 backdrop-blur-sm border border-border/40 rounded-lg m-2 animate-in fade-in duration-300">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-foreground leading-tight">{item.companyName}</h4>
            <p className="text-xs text-muted-foreground">{item.accountingFirmName || "Sem contador vinculado"}</p>
          </div>
          <Badge variant={getCompetencyStatusVariant(item.status)} className="shrink-0 text-[10px]">
            {getCompetencyStatusLabel(item.status)}
          </Badge>
        </div>

        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <div className="text-sm font-semibold text-foreground">{item.title}</div>
          <div className="text-xs text-muted-foreground">
            Competência: {String(item.month).padStart(2, "0")}/{item.year}
          </div>
          <div className="text-xs text-muted-foreground">
            Contato: {item.clientContactName || "Não definido"}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
          <div>
            Vencimento: <span className="font-medium text-foreground">{formatDateShort(item.dueDate)}</span>
          </div>
          <div>
            Checklist: <span className="font-medium text-foreground">{item.requiredDocumentsCount} item(ns)</span>
          </div>
        </div>

        {item.lastManualRequestAt ? (
          <div className="text-[11px] border-t border-border/40 pt-2 text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <span>Último disparo:</span>
              <Badge variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")} className="text-[9px] px-1 py-0 h-4">
                {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
              </Badge>
            </div>
            <p>
              {item.lastManualRequestContactName || "Contato"} - {formatDateTime(item.lastManualRequestAt)} ({item.manualRequestsCount} envios)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Sem disparos manuais</p>
        )}

        {canManage && (
          <div className="flex justify-end gap-2 border-t border-border/40 pt-3" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs py-1 px-3"
              onClick={() => setSelectedStatusCompetency(item)}
            >
              Atualizar status
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs py-1 px-3"
              onClick={() => setSelectedCompetency(item)}
              disabled={item.availableContacts.length === 0}
            >
              <MessageSquareShare className="mr-1 h-3 w-3" />
              {item.manualRequestsCount > 0 ? "Reenviar" : "Disparo"}
            </Button>
          </div>
        )}
      </div>
    ),
    [canManage]
  );

  const renderMobileConfigQueue = useCallback(
    (item: MonthlyRoutineListResponse["items"][number]) => (
      <div className="flex flex-col p-4 gap-3 bg-card/40 backdrop-blur-sm border border-border/40 rounded-lg m-2 animate-in fade-in duration-300">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm text-foreground leading-tight">{item.companyTradeName || item.companyName}</h4>
              <p className="text-xs text-muted-foreground">{item.companyName}</p>
              <Link
                href={`/portal/cadastros/empresa/${item.companyId}/editar`}
                className="inline-block text-xs font-medium text-primary hover:underline"
              >
                Abrir cadastro da empresa
              </Link>
            </div>
          </div>
          <Badge variant={getStatusVariant(item.candidateStatus)} className="shrink-0 text-[10px]">
            {getStatusLabel(item.candidateStatus)}
          </Badge>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-2 text-xs">
          <div className="space-y-0.5">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Contador</span>
            {item.accountingFirmName ? (
              <div className="space-y-1">
                <span className="text-foreground font-medium">{item.accountingFirmName}</span>
                {item.accountingFirmId && (
                  <div>
                    <Link
                      href={`/portal/cadastros/empresa/${item.accountingFirmId}/editar`}
                      className="inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Abrir cadastro do contador
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground italic">Não vinculado</span>
            )}
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Contato Principal</span>
            {item.primaryContactName ? (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-foreground font-medium">
                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {item.primaryContactName}
                </div>
                <div className="text-muted-foreground text-xs">{item.primaryContactEmail || "Sem email principal"}</div>
                <div className="text-muted-foreground text-xs">{item.contactsCount} contato(s) vinculado(s)</div>
              </div>
            ) : (
              <span className="text-muted-foreground italic">Nenhum contato principal</span>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
            <div>Regime Tributário</div>
            <div className="font-semibold text-foreground">
              {item.taxRegime ? item.taxRegime.replaceAll("_", " ") : "Não definido"}
            </div>
          </div>
        </div>
      </div>
    ),
    []
  );

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    const normalizedCurrent = search.trim();
    const normalizedNext = deferredSearch.trim();
    if (normalizedCurrent === normalizedNext) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (normalizedNext) {
        params.set("search", normalizedNext);
      } else {
        params.delete("search");
      }
      router.replace(`/portal/rotinas-mensais${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }, [deferredSearch, router, search, searchParams]);

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
      <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-muted/30 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              Rotinas Mensais
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Base operacional para entrega recorrente</h1>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Este primeiro corte usa o cadastro de empresa, contador vinculado e contato principal para formar a fila inicial de configuracao do modulo.
              </p>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Buscar empresa, contador ou contato..."
                className="h-11 pl-10"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isPending ? "Atualizando lista..." : `${data.pagination.total} registro(s) no recorte atual.`}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas no recorte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{data.summary.totalCompanies}</p>
            <p className="mt-1 text-xs text-muted-foreground">Base acessivel para iniciar parametrizacao mensal.</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com contador vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{data.summary.withAccountingFirm}</p>
            <p className="mt-1 text-xs text-muted-foreground">Empresas que ja podem evoluir para configuracao da rotina.</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prontas para configurar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{data.summary.readyToConfigure}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ja possuem contador e ao menos um contato principal.</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendencias cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {data.summary.missingAccountingFirm + data.summary.missingPrimaryContact}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Empresas que ainda dependem de ajuste antes da automacao mensal.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              Competencias do mes {String(competencies.month).padStart(2, "0")}/{competencies.year}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Fila operacional gerada a partir das configuracoes ativas por empresa.
            </p>
          </div>
          {canManage ? (
            <Button type="button" variant="outline" onClick={handleSyncMonth} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar competencias"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{competencies.summary.total}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{competencies.summary.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Aguardando cliente</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{competencies.summary.waitingCustomer}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Recebidas</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{competencies.summary.received}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Enviadas</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{competencies.summary.sentToAccounting}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{competencies.summary.overdue}</p>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={competencyColumns}
            data={competencies.items}
            loading={isPending}
            loadingLabel="Carregando competências..."
            emptyState={{
              title: "Nenhuma competência gerada",
              description: "Ative empresas na configuração de rotina mensal para iniciar a fila do mês.",
              icon: CircleAlert,
            }}
            flexible={true}
            rowClassName={() => "align-top"}
            renderMobileItem={renderMobileCompetency}
          />
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

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Fila inicial de configuracao</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta listagem nasce do cadastro de empresa e vai alimentar as proximas etapas do modulo.
            </p>
          </div>
          <Link
            href="/portal/cadastros/empresa"
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            <Settings2 className="h-4 w-4" />
            Revisar empresas
          </Link>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={configColumns}
            data={data.items}
            loading={isPending}
            loadingLabel="Carregando empresas..."
            emptyState={{
              title: "Nenhuma empresa encontrada",
              description: "Ajuste os filtros ou finalize o vínculo de empresas e contadores para iniciar a rotina mensal.",
              icon: CircleAlert,
            }}
            flexible={true}
            rowClassName={() => "align-top"}
            renderMobileItem={renderMobileConfigQueue}
          />
        </CardContent>
      </Card>
    </div>
  );
}
