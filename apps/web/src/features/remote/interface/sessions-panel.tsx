"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import { Activity, Filter, Monitor, Ticket, User } from "lucide-react";
import { RegistryDataTable } from "@/components/platform/shared/registry-list-scaffold";
import { FilterTabs, SearchToolbar } from "@/components/patterns";
import { cn } from "@/lib/utils";
import type { EfficiencyMetrics } from "@/features/remote/application/report-queries";
import type { RemotePaginationMeta, RemoteSessionStatus } from "@/features/remote/domain/remote-host.types";
import type { OperationsView } from "@/features/remote/interface/operations-view";
import { deviceManagedDetailPath } from "@/features/infrastructure/device/domain/device-detail-paths";
import { formatDateOnly, formatDateTime } from "./host-details/host-details.helpers";

interface SessionItem extends RemoteSessionSummary {
  hostName: string;
  companyName: string | null;
  requestedByName: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

interface RemoteSessionSummary {
  id: string;
  companyId: string;
  ticketId: string | null;
  ticketNumber: string | null;
  hostId: string;
  requestedByUserId: string;
  startedByUserId: string | null;
  status: RemoteSessionStatus;
}

type StatusFilter = "ALL" | "ACTIVE" | RemoteSessionStatus;

interface RemoteSessionsPanelProps {
  sessions: SessionItem[];
  pagination: RemotePaginationMeta;
  hostOptions: Array<{ id: string; name: string }>;
  view: OperationsView;
  metrics?: EfficiencyMetrics;
  filters: {
    status: StatusFilter;
    hostId: string;
    ticket: string;
  };
}

function formatRelativeStart(value: string | null) {
  if (!value) return "Sem início";

  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays}d`;
}

function isStoppableSession(status: RemoteSessionStatus) {
  return status === "REQUESTED" || status === "STARTED";
}

export function RemoteSessionsPanel({
  sessions,
  pagination,
  hostOptions,
  view,
  filters,
}: RemoteSessionsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [stoppingSessionId, setStoppingSessionId] = useState<string | null>(null);
  const [hostDraft, setHostDraft] = useState(filters.hostId);
  const [ticketDraft, setTicketDraft] = useState(filters.ticket);

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyFilters = () => {
    updateParams((params) => {
      params.set("tab", "operacao");
      params.set("view", view);

      if (hostDraft) {
        params.set("host", hostDraft);
      } else {
        params.delete("host");
      }

      if (ticketDraft.trim()) {
        params.set("ticket", ticketDraft.trim());
      } else {
        params.delete("ticket");
      }

      params.set("page", "1");
    });
  };

  const clearFilters = () => {
    setHostDraft("");
    setTicketDraft("");

    updateParams((params) => {
      params.set("tab", "operacao");
      params.set("view", view);
      params.delete("host");
      params.delete("ticket");
      params.set("page", "1");
    });
  };

  const goToPage = (nextPage: number) => {
    updateParams((params) => {
      params.set("tab", "operacao");
      params.set("view", view);
      params.set("page", String(Math.max(1, nextPage)));
    });
  };

  const setView = (nextView: OperationsView) => {
    updateParams((params) => {
      params.set("tab", "operacao");
      params.set("view", nextView);
      params.set("page", "1");
    });
  };

  const handleStopSession = (sessionId: string) => {
    setStoppingSessionId(sessionId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/remote/sessions/${sessionId}/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const json = (await response.json()) as { success?: boolean; message?: string };
        if (!response.ok || !json.success) {
          toast.error(json.message ?? "Não foi possível encerrar a sessão.");
          return;
        }

        toast.success("Sessão encerrada com sucesso.");
        router.refresh();
      } catch {
        toast.error("Erro de conexão ao encerrar a sessão.");
      } finally {
        setStoppingSessionId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <FilterTabs
        options={[
          { value: "em_andamento", label: "Em andamento" },
          { value: "requer_acao", label: "Requer ação" },
          { value: "concluidas", label: "Concluídas" },
          { value: "falhas", label: "Falhas" },
        ]}
        value={view}
        onChange={setView}
      />

      <SearchToolbar
        searchValue={ticketDraft}
        onSearchChange={setTicketDraft}
        onClearSearch={clearFilters}
        searchPlaceholder="Buscar por número de ticket..."
        resultLabel={`${sessions.length} operaç${sessions.length === 1 ? "ão" : "ões"}`}
        filters={
          <Select value={hostDraft || "ALL"} onValueChange={(value) => setHostDraft(value === "ALL" ? "" : value)}>
            <SelectTrigger className="h-9 w-55 bg-background text-sm">
              <Monitor className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Todos os dispositivos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os dispositivos</SelectItem>
              {hostOptions.map((host) => (
                <SelectItem key={host.id} value={host.id}>
                  {host.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <>
            <Button type="button" size="sm" onClick={applyFilters} className="h-9 gap-1.5" disabled={isPending}>
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            {(hostDraft || ticketDraft) && (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters} className="h-9" disabled={isPending}>
                Limpar
              </Button>
            )}
          </>
        }
      />

      <section className="space-y-4">
        <RegistryDataTable
          isEmpty={sessions.length === 0}
          emptyState={{
            icon: Activity,
            title: "Nenhuma operação encontrada.",
            description: "Ajuste os filtros ou selecione outra visualização.",
          }}
          desktopColSpan={7}
          flexible={true}
          desktopHeader={
            <tr className="border-b border-border/40 hover:bg-transparent">
              <th className="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">
                Operação
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-0">
                Dispositivo
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-0">
                Empresa
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36">
                Estado
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground w-40">
                Iniciada em
              </th>
              <th className="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground w-40">
                Responsável
              </th>
              <th className="h-10 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36">
                Ações
              </th>
            </tr>
          }
          desktopContent={sessions.map((session) => (
            <SessionTableRow
              key={session.id}
              session={session}
              isStopping={stoppingSessionId === session.id}
              onStopSession={handleStopSession}
            />
          ))}
          mobileContent={sessions.map((session) => (
            <SessionListRow
              key={session.id}
              session={session}
              isStopping={stoppingSessionId === session.id}
              onStopSession={handleStopSession}
            />
          ))}
          pagination={{
            pagination,
            itemLabel: { singular: "operação", plural: "operações" },
            isLoading: isPending,
            onPageChange: goToPage,
          }}
        />
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: RemoteSessionStatus }) {
  const meta: Record<RemoteSessionStatus, { label: string; tone: string }> = {
    REQUESTED: { label: "Solicitada", tone: "border-blue-500/20 bg-blue-500/10 text-blue-600" },
    STARTED: { label: "Conectada", tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" },
    ENDED: { label: "Finalizada", tone: "border-border bg-muted text-muted-foreground" },
    FAILED: { label: "Falhou", tone: "border-rose-500/20 bg-rose-500/10 text-rose-600" },
    CANCELLED: { label: "Cancelada", tone: "border-amber-500/20 bg-amber-500/10 text-amber-600" },
  };

  return (
    <Badge variant="outline" className={cn("font-medium", meta[status].tone)}>
      {meta[status].label}
    </Badge>
  );
}

function SessionTableRow({
  session,
  isStopping = false,
  onStopSession,
}: {
  session: SessionItem;
  isStopping?: boolean;
  onStopSession?: (sessionId: string) => void;
}) {
  const startReference = session.startedAt ?? session.createdAt;
  const startAbsolute = formatDateTime(startReference);
  const deviceHref = deviceManagedDetailPath(session.hostId);
  const canStop = isStoppableSession(session.status);

  return (
    <tr className="group/row transition-all duration-200 hover:bg-muted/20 hover:shadow-sm">
      <td className="w-32 px-4 py-2.5 align-middle">
        {session.ticketNumber ? (
          <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/10 bg-primary/5 px-2 py-1 text-xs font-medium text-primary">
            <Ticket className="h-3.5 w-3.5" />
            #{session.ticketNumber}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sem ticket</span>
        )}
      </td>
      <td className="min-w-0 px-4 py-2.5 align-middle">
        <Link href={deviceHref} className="flex items-center gap-2 hover:text-primary">
          <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="truncate text-sm font-semibold underline-offset-2 hover:underline">{session.hostName}</p>
        </Link>
      </td>
      <td className="min-w-0 px-4 py-2.5 align-middle">
        <p className="truncate text-sm">{session.companyName || "-"}</p>
      </td>
      <td className="w-36 px-4 py-2.5 align-middle">
        <StatusBadge status={session.status} />
      </td>
      <td className="w-40 px-4 py-2.5 align-middle" title={startAbsolute}>
        <p className="text-xs font-medium">{formatDateOnly(startReference)}</p>
        <p className="text-[10px] uppercase text-muted-foreground">{formatRelativeStart(startReference)}</p>
      </td>
      <td className="w-40 px-4 py-2.5 align-middle">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate text-xs">{session.requestedByName || "-"}</span>
        </div>
      </td>
      <td className="w-36 px-4 py-2.5 align-middle">
        <div className="flex items-center justify-end gap-1.5">
          <Button asChild type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs">
            <Link href={deviceHref}>Abrir</Link>
          </Button>
          {canStop && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2.5 text-xs border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => onStopSession?.(session.id)}
              disabled={isStopping}
            >
              {isStopping ? "..." : "Encerrar"}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SessionListRow({
  session,
  isStopping = false,
  onStopSession,
}: {
  session: SessionItem;
  isStopping?: boolean;
  onStopSession?: (sessionId: string) => void;
}) {
  const startReference = session.startedAt ?? session.createdAt;
  const startAbsolute = formatDateTime(startReference);
  const deviceHref = deviceManagedDetailPath(session.hostId);
  const canStop = isStoppableSession(session.status);

  return (
    <div className="space-y-3 p-4 transition-colors hover:bg-muted/5">
      <div className="flex items-center justify-between gap-4">
        <Link href={deviceHref} className="flex flex-1 items-center gap-4 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-muted/20">
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-semibold underline-offset-2 hover:underline">{session.hostName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{session.companyName}</span>
              <span>-</span>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate">{session.requestedByName}</span>
              </div>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {session.ticketNumber && (
            <div className="hidden items-center gap-1.5 rounded-md border border-primary/10 bg-primary/5 px-2 py-1 text-xs font-medium text-primary sm:flex">
              <Ticket className="h-3.5 w-3.5" />
              #{session.ticketNumber}
            </div>
          )}

          <div className="hidden space-y-0.5 text-right md:block" title={startAbsolute}>
            <p className="text-xs font-medium">{formatDateOnly(startReference)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">{formatRelativeStart(startReference)}</p>
          </div>

          <div className="flex w-24 justify-end">
            <StatusBadge status={session.status} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button asChild type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs">
          <Link href={deviceHref}>Abrir dispositivo</Link>
        </Button>
        {canStop && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 px-2.5 text-xs border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600"
            onClick={() => onStopSession?.(session.id)}
            disabled={isStopping}
          >
            {isStopping ? "Encerrando..." : "Encerrar"}
          </Button>
        )}
      </div>
    </div>
  );
}
