"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, BarChart3, Clock, Filter, History, Monitor, Ticket, User } from "lucide-react";
import { RegistryPagination } from "@/components/platform/shared/RegistryListScaffold";
import { cn } from "@/lib/utils";
import type { EfficiencyMetrics } from "@/features/remote/application/report-queries";
import { RemoteEfficiencyReportsPanel } from "@/features/remote/interface/reports-panel";
import type { RemotePaginationMeta, RemoteSessionStatus } from "@/features/remote/domain/remote-host.types";
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
type OperationsView = "todas" | "ativas" | "historico" | "eficiencia";

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

const VIEW_LABELS: Array<{ value: OperationsView; label: string; icon: typeof Activity }> = [
  { value: "todas", label: "Todas", icon: Activity },
  { value: "ativas", label: "Ativas", icon: Monitor },
  { value: "historico", label: "Histórico", icon: History },
  { value: "eficiencia", label: "Eficiência", icon: BarChart3 },
];

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

export function RemoteSessionsPanel({
  sessions,
  pagination,
  hostOptions,
  view,
  metrics,
  filters,
}: RemoteSessionsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [stoppingSessionId, setStoppingSessionId] = useState<string | null>(null);
  const [hostDraft, setHostDraft] = useState(filters.hostId);
  const [ticketDraft, setTicketDraft] = useState(filters.ticket);

  const activeSessions = sessions.filter((session) => session.status === "REQUESTED" || session.status === "STARTED");
  const pastSessions = sessions.filter((session) => session.status !== "REQUESTED" && session.status !== "STARTED");
  const requestedSessions = sessions.filter((session) => session.status === "REQUESTED").length;
  const startedSessions = sessions.filter((session) => session.status === "STARTED").length;
  const uniqueHosts = new Set(sessions.map((session) => session.hostId)).size;
  const linkedTickets = new Set(sessions.map((session) => session.ticketNumber).filter(Boolean)).size;

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SessionStatCard label="Sessões visíveis" value={sessions.length} icon={<Activity className="h-4 w-4" />} accent="slate" />
        <SessionStatCard label="Solicitadas" value={requestedSessions} icon={<Clock className="h-4 w-4" />} accent="amber" />
        <SessionStatCard label="Conectadas" value={startedSessions} icon={<Monitor className="h-4 w-4" />} accent="emerald" />
        <SessionStatCard
          label="Hosts envolvidos"
          value={uniqueHosts}
          hint={`${linkedTickets} tickets com remoto`}
          icon={<Ticket className="h-4 w-4" />}
          accent="violet"
        />
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {VIEW_LABELS.map((entry) => {
            const Icon = entry.icon;
            const active = view === entry.value;
            return (
              <Button
                key={entry.value}
                type="button"
                variant={active ? "default" : "outline"}
                className={cn("h-9 gap-2", active ? "" : "bg-background")}
                onClick={() => setView(entry.value)}
              >
                <Icon className="h-4 w-4" />
                {entry.label}
              </Button>
            );
          })}
        </div>
      </section>

      {view !== "eficiencia" ? (
        <Card className="border-border/50 bg-background/70">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[220px_1fr_auto_auto] md:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Host</label>
              <Select value={hostDraft || "ALL"} onValueChange={(value) => setHostDraft(value === "ALL" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {hostOptions.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      {host.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ticket</label>
              <Input value={ticketDraft} onChange={(event) => setTicketDraft(event.target.value)} placeholder="Ex.: 12345" />
            </div>

            <Button type="button" onClick={applyFilters} className="gap-2" disabled={isPending}>
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>

            <Button type="button" variant="outline" onClick={clearFilters} disabled={isPending}>
              Limpar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view === "eficiencia" ? (
        metrics ? <RemoteEfficiencyReportsPanel metrics={metrics} /> : null
      ) : (
        <>
          {(view === "todas" || view === "ativas") && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    Sessões em andamento
                  </h2>
                  <p className="text-sm text-muted-foreground">Monitoramento de técnicos conectados em tempo real.</p>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                  {activeSessions.length} Ativas
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeSessions.length > 0 ? (
                  activeSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isActive
                      isStopping={isPending && stoppingSessionId === session.id}
                      onStopSession={handleStopSession}
                    />
                  ))
                ) : (
                  <Card className="col-span-full border-dashed bg-muted/5">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                      <Monitor className="mb-4 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">Nenhuma sessão ativa no momento.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          )}

          {(view === "todas" || view === "historico") && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-xl font-semibold">Histórico recente</h2>
                  <p className="text-sm text-muted-foreground">Sessões mais recentes, ordenadas por atualização.</p>
                </div>
              </div>

              <Card className="border-border/50">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {pastSessions.length > 0 ? (
                      pastSessions.map((session) => <SessionListRow key={session.id} session={session} />)
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">Nenhum histórico de sessões encontrado.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {(view === "todas" || view === "historico") && (
            <RegistryPagination
              pagination={pagination}
              itemLabel={{ singular: "sessão", plural: "sessões" }}
              isLoading={isPending}
              onPageChange={goToPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function SessionStatCard(props: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent: "slate" | "emerald" | "amber" | "violet";
}) {
  const accentClass = {
    slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  } as const;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{props.label}</span>
          <span className={cn("rounded-md p-1.5", accentClass[props.accent])}>{props.icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold leading-none tabular-nums">{props.value}</div>
        {props.hint ? <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div> : null}
      </CardContent>
    </Card>
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

function SessionCard({
  session,
  isActive,
  isStopping = false,
  onStopSession,
}: {
  session: SessionItem;
  isActive?: boolean;
  isStopping?: boolean;
  onStopSession?: (sessionId: string) => void;
}) {
  const startReference = session.startedAt ?? session.createdAt;
  const startAbsolute = formatDateTime(startReference);

  return (
    <Card
      className={cn(
        "border-border/50 transition-all hover:border-primary/30",
        isActive && "border-emerald-500/20 shadow-sm shadow-emerald-500/5",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold leading-none">{session.hostName}</span>
            </div>
            <p className="text-xs text-muted-foreground">{session.companyName}</p>
          </div>
          <StatusBadge status={session.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {session.ticketNumber && (
            <div className="flex items-center gap-2 text-xs">
              <Ticket className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Ticket #{session.ticketNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{session.requestedByName ?? "Operador desconhecido"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span title={startAbsolute}>Iniciada {formatRelativeStart(startReference)}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 text-xs" asChild>
            <Link href={`/portal/infraestrutura/hosts/${session.hostId}`}>Ver máquina</Link>
          </Button>
          {isActive && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-full gap-1.5 border-rose-500/20 text-xs hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => onStopSession?.(session.id)}
              disabled={isStopping}
            >
              Encerrar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionListRow({ session }: { session: SessionItem }) {
  const startReference = session.startedAt ?? session.createdAt;
  const startAbsolute = formatDateTime(startReference);

  return (
    <div className="group flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/5">
      <div className="flex flex-1 items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-muted/20">
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-semibold">{session.hostName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{session.companyName}</span>
            <span>-</span>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{session.requestedByName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
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
  );
}
