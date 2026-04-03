"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, 
  Clock, 
  ExternalLink, 
  History, 
  Monitor, 
  PauseCircle, 
  PlayCircle, 
  StopCircle, 
  Ticket, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteSessionSummary, RemoteSessionStatus } from "@/features/remote/domain/model";
import { formatDateTime, formatDateOnly } from "./host-details/utils";

interface SessionItem extends RemoteSessionSummary {
  hostName: string;
  companyName: string | null;
  requestedByName: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export function RemoteSessionsPanel({ sessions }: { sessions: SessionItem[] }) {
  const activeSessions = sessions.filter(s => s.status === "REQUESTED" || s.status === "STARTED");
  const pastSessions = sessions.filter(s => s.status !== "REQUESTED" && s.status !== "STARTED");

  return (
    <div className="space-y-8">
      {/* Resumo de Sessoes Ativas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Sessões em Andamento
            </h2>
            <p className="text-sm text-muted-foreground">Monitoramento de técnicos conectados a máquinas agora.</p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            {activeSessions.length} Ativas
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} isActive />
            ))
          ) : (
            <Card className="col-span-full border-dashed bg-muted/5">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Monitor className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma sessão ativa no momento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Historico de Sessoes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Histórico Recente</h2>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {pastSessions.length > 0 ? (
                pastSessions.map((session) => (
                  <SessionListRow key={session.id} session={session} />
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum histórico de sessões encontrado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: RemoteSessionStatus }) {
  const meta: Record<RemoteSessionStatus, { label: string, tone: string }> = {
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

function SessionCard({ session, isActive }: { session: SessionItem, isActive?: boolean }) {
  return (
    <Card className={cn(
      "border-border/50 transition-all hover:border-primary/30",
      isActive && "border-emerald-500/20 shadow-sm shadow-emerald-500/5"
    )}>
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
            <span>Iniciada há {new Date(session.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" asChild>
            <a href={`/portal/plataforma-remota/hosts/${session.hostId}`}>
              Ver Maquina
            </a>
          </Button>
          {isActive && (
            <Button variant="secondary" size="sm" className="w-full h-8 text-xs gap-1.5 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600">
              Encerrar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionListRow({ session }: { session: SessionItem }) {
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
            <span>•</span>
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
        
        <div className="hidden md:block text-right space-y-0.5">
          <p className="text-xs font-medium">{new Date(session.createdAt).toLocaleDateString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div className="w-24 flex justify-end">
          <StatusBadge status={session.status} />
        </div>
      </div>
    </div>
  );
}
