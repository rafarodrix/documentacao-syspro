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
import { Activity, Clock, History, Monitor, Ticket, User, Filter } from "lucide-react";
import { RegistryPagination } from "@/components/platform/shared/RegistryListScaffold";
import { cn } from "@/lib/utils";
import type { RemotePaginationMeta, RemoteSessionSummary, RemoteSessionStatus } from "@/features/remote/domain/model";
import { formatDateOnly, formatDateTime } from "./host-details/host-details.helpers";

interface SessionItem extends RemoteSessionSummary {
  hostName: string;
  companyName: string | null;
  requestedByName: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

type StatusFilter = "ALL" | "ACTIVE" | RemoteSessionStatus;

interface RemoteSessionsPanelProps {
  sessions: SessionItem[];
  pagination: RemotePaginationMeta;
  hostOptions: Array<{ id: string; name: string }>;
  filters: {
    status: StatusFilter;
    hostId: string;
    ticket: string;
  };
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "Todos",
  ACTIVE: "Ativas",
  REQUESTED: "Solicitadas",
  STARTED: "Conectadas",
  ENDED: "Finalizadas",
  FAILED: "Falhas",
  CANCELLED: "Canceladas",
};

function formatRelativeStart(value: string | null) {
  if (!value) return "Sem inicio";

  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `ha ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `ha ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `ha ${diffDays}d`;
}

export function RemoteSessionsPanel({ sessions, pagination, hostOptions, filters }: RemoteSessionsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [stoppingSessionId, setStoppingSessionId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<StatusFilter>(filters.status);
  const [hostDraft, setHostDraft] = useState(filters.hostId);
  const [ticketDraft, setTicketDraft] = useState(filters.ticket);

  const activeSessions = sessions.filter((s) => s.status === "REQUESTED" || s.status === "STARTED");
  const pastSessions = sessions.filter((s) => s.status !== "REQUESTED" && s.status !== "STARTED");
  const requestedSessions = sessions.filter((s) => s.status === "REQUESTED").length;
  const startedSessions = sessions.filter((s) => s.status === "STARTED").length;
  const uniqueHosts = new Set(sessions.map((session) => session.hostId)).size;
  const linkedTickets = new Set(sessions.map((session) => session.ticketNumber).filter(Boolean)).size;

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyFilters = () => {
    updateParams((params) => {
      if (!statusDraft || statusDraft === "ALL") {
        params.delete("status");
      } else {
        params.set("status", statusDraft);
      }

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
    setStatusDraft("ALL");
    setHostDraft("");
    setTicketDraft("");

    updateParams((params) => {
      params.delete("status");
      params.delete("host");
      params.delete("ticket");
      params.set("page", "1");
    });
  };

  const goToPage = (nextPage: number) => {
    updateParams((params) => {
      params.set("page", String(Math.max(1, nextPage)));
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
          toast.error(json.message ?? "Nao foi possivel encerrar a sessao.");
          return;
        }

        toast.success("Sessao encerrada com sucesso.");
        router.refresh();
      } catch {
        toast.error("Erro de conexao ao encerrar a sessao.");
      } finally {
        setStoppingSessionId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SessionStatCard label="Sessoes visiveis" value={sessions.length} icon={<Activity className="h-4 w-4" />} accent="slate" />
        <SessionStatCard label="Solicitadas" value={requestedSessions} icon={<Clock className="h-4 w-4" />} accent="amber" />
        <SessionStatCard label="Conectadas" value={startedSessions} icon={<Monitor className="h-4 w-4" />} accent="emerald" />
        <SessionStatCard label="Hosts envolvidos" value={uniqueHosts} hint={`${linkedTickets} tickets com remoto`} icon={<Ticket className="h-4 w-4" />} accent="violet" />
      </div>

      <Card className="border-border/50 bg-background/70">
        <CardContent className="p-4 grid gap-3 md:grid-cols-[180px_220px_1fr_auto_auto] md:items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Input
              value={ticketDraft}
              onChange={(event) => setTicketDraft(event.target.value)}
              placeholder="Ex.: 12345"
            />
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Sessoes em andamento
            </h2>
            <p className="text-sm text-muted-foreground">Monitoramento de tecnicos conectados em tempo real.</p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
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
                <Monitor className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma sessao ativa no momento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Historico recente</h2>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {pastSessions.length > 0 ? (
                pastSessions.map((session) => <SessionListRow key={session.id} session={session} />)
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhum historico de sessoes encontrado.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <RegistryPagination
        pagination={pagination}
        itemLabel={{ singular: "sessao", plural: "sessoes" }}
        isLoading={isPending}
        onPageChange={goToPage}
      />
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
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {props.label}
          </span>
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
    REQUESTED: { label: "Solicitada", tone: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    STARTED: { label: "Conectada", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    ENDED: { label: "Finalizada", tone: "bg-muted text-muted-foreground border-border" },
    FAILED: { label: "Falhou", tone: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    CANCELLED: { label: "Cancelada", tone: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
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
              <span className="font-semibold text-sm leading-none">{session.hostName}</span>
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

        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" asChild>
            <Link href={`/portal/infraestrutura/hosts/${session.hostId}`}>Ver maquina</Link>
          </Button>
          {isActive && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-8 text-xs gap-1.5 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600"
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
    <div className="group flex items-center justify-between gap-4 p-4 hover:bg-muted/5 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-9 w-9 rounded-full bg-muted/20 flex items-center justify-center border border-border/50">
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-semibold truncate">{session.hostName}</p>
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
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
            <Ticket className="h-3.5 w-3.5" />
            #{session.ticketNumber}
          </div>
        )}

        <div className="hidden md:block text-right space-y-0.5" title={startAbsolute}>
          <p className="text-xs font-medium">{formatDateOnly(startReference)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{formatRelativeStart(startReference)}</p>
        </div>

        <div className="w-24 flex justify-end">
          <StatusBadge status={session.status} />
        </div>
      </div>
    </div>
  );
}
