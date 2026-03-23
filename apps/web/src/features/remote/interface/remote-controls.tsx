"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RemotePlatformOverview } from "@/features/remote/domain/model";

type Props = {
  overview: RemotePlatformOverview;
};

async function parseJson(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "Falha na operacao.");
  }
  return payload;
}

export function RemotePlatformControls({ overview }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refreshTimerRef = useRef<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(overview.companyOptions[0]?.id ?? "");
  const [hostName, setHostName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [provider, setProvider] = useState("RustDesk");
  const [description, setDescription] = useState("");
  const [agentExternalId, setAgentExternalId] = useState("");
  const [hostStatus, setHostStatus] = useState<"ACTIVE" | "INACTIVE" | "MAINTENANCE">("ACTIVE");
  const [editingHostId, setEditingHostId] = useState("");
  const [selectedHostId, setSelectedHostId] = useState("");
  const [sessionCompanyId, setSessionCompanyId] = useState(overview.companyOptions[0]?.id ?? "");
  const [sessionTicketId, setSessionTicketId] = useState("");
  const [sessionTicketNumber, setSessionTicketNumber] = useState("");
  const [sessionReason, setSessionReason] = useState("");
  const [recentHosts, setRecentHosts] = useState(overview.recentHosts);
  const [recentSessions, setRecentSessions] = useState(overview.recentSessions);
  const [hostOptionsState, setHostOptionsState] = useState(overview.hostOptions);

  const canCreateHosts = overview.tenantScope.role !== "CLIENTE_ADMIN";
  const isEditing = Boolean(editingHostId);
  const hostOptions = useMemo(() => {
    if (!sessionCompanyId) return hostOptionsState;
    return hostOptionsState.filter((host) => host.companyId === sessionCompanyId);
  }, [hostOptionsState, sessionCompanyId]);

  useEffect(() => {
    setRecentHosts(overview.recentHosts);
    setRecentSessions(overview.recentSessions);
    setHostOptionsState(overview.hostOptions);
  }, [overview.recentHosts, overview.recentSessions, overview.hostOptions]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  function queueBackgroundRefresh() {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      startTransition(() => router.refresh());
      refreshTimerRef.current = null;
    }, 250);
  }

  function resolveCompanyLabel(companyId: string) {
    return overview.companyOptions.find((company) => company.id === companyId)?.label ?? "Sem empresa";
  }

  function resetHostForm() {
    setEditingHostId("");
    setSelectedCompanyId(overview.companyOptions[0]?.id ?? "");
    setHostName("");
    setEnvironment("");
    setProvider("RustDesk");
    setDescription("");
    setAgentExternalId("");
    setHostStatus("ACTIVE");
  }

  async function handleCreateHost() {
    if (!selectedCompanyId || !hostName.trim()) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    try {
      const payload = await parseJson(
        await fetch(isEditing ? `/api/remote/hosts/${editingHostId}` : "/api/remote/hosts", {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            name: hostName,
            environment,
            provider,
            description,
            agentExternalId,
            status: hostStatus,
          }),
        })
      );
      const savedHost = payload.data as {
        id: string;
        companyId: string;
        name: string;
        environment: string | null;
        provider: string | null;
        description: string | null;
        agentExternalId: string | null;
        installToken: string | null;
        machineName: string | null;
        agentVersion: string | null;
        status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
        createdAt: string;
        updatedAt: string;
        lastHeartbeatAt: string | null;
      };
      const hostLabel = `${savedHost.name} (${resolveCompanyLabel(savedHost.companyId)})`;
      const mappedHost = {
        id: savedHost.id,
        companyId: savedHost.companyId,
        name: savedHost.name,
        environment: savedHost.environment,
        provider: savedHost.provider,
        description: savedHost.description,
        agentExternalId: savedHost.agentExternalId,
        installToken: savedHost.installToken,
        machineName: savedHost.machineName,
        agentVersion: savedHost.agentVersion,
        status: savedHost.status,
        companyName: resolveCompanyLabel(savedHost.companyId),
        createdAt: savedHost.createdAt,
        lastHeartbeatAt: savedHost.lastHeartbeatAt,
      };

      toast.success(isEditing ? "Host remoto atualizado." : "Host remoto criado.");
      setRecentHosts((current) => {
        const next = [mappedHost, ...current.filter((host) => host.id !== mappedHost.id)];
        return next.slice(0, 6);
      });
      setHostOptionsState((current) => {
        const next = [
          { id: savedHost.id, companyId: savedHost.companyId, label: hostLabel, status: savedHost.status },
          ...current.filter((host) => host.id !== savedHost.id),
        ];
        return next.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
      });
      resetHostForm();
      queueBackgroundRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar host.");
    }
  }

  async function handleDeleteHost(hostId: string, hostNameValue: string) {
    if (!window.confirm(`Excluir o host "${hostNameValue}"?`)) {
      return;
    }

    try {
      await parseJson(
        await fetch(`/api/remote/hosts/${hostId}`, {
          method: "DELETE",
        })
      );

      if (editingHostId === hostId) {
        resetHostForm();
      }
      setRecentHosts((current) => current.filter((host) => host.id !== hostId));
      setHostOptionsState((current) => current.filter((host) => host.id !== hostId));
      if (selectedHostId === hostId) {
        setSelectedHostId("");
      }
      toast.success("Host remoto excluido.");
      queueBackgroundRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir host.");
    }
  }

  async function handleCreateSession() {
    if (!sessionCompanyId || !selectedHostId) {
      toast.error("Selecione empresa e host.");
      return;
    }

    try {
      const payload = await parseJson(
        await fetch("/api/remote/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: sessionCompanyId,
            hostId: selectedHostId,
            ticketId: sessionTicketId,
            ticketNumber: sessionTicketNumber,
            reason: sessionReason,
          }),
        })
      );
      const createdSession = payload.data as {
        id: string;
        companyId: string;
        ticketId: string | null;
        ticketNumber: string | null;
        hostId: string;
        requestedByUserId: string;
        startedByUserId: string | null;
        status: "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED";
        createdAt: string;
        startedAt: string | null;
        endedAt: string | null;
      };
      const selectedHost = hostOptionsState.find((host) => host.id === createdSession.hostId);

      toast.success("Sessao remota solicitada.");
      setRecentSessions((current) => {
        const next = [
          {
            ...createdSession,
            hostName: selectedHost?.label.split(" (")[0] ?? "Host",
            companyName: resolveCompanyLabel(createdSession.companyId),
            requestedByName: null,
          },
          ...current.filter((session) => session.id !== createdSession.id),
        ];
        return next.slice(0, 6);
      });
      setSessionTicketId("");
      setSessionTicketNumber("");
      setSessionReason("");
      queueBackgroundRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao solicitar sessao.");
    }
  }

  async function handleSessionTransition(sessionId: string, action: "start" | "stop") {
    try {
      const payload = await parseJson(
        await fetch(`/api/remote/sessions/${sessionId}/${action}`, {
          method: "POST",
        })
      );
      const updatedSession = payload.data as {
        id: string;
        status: "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED";
        startedByUserId: string | null;
        startedAt: string | null;
        endedAt: string | null;
      };

      toast.success(action === "start" ? "Sessao iniciada." : "Sessao encerrada.");
      setRecentSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                status: updatedSession.status,
                startedByUserId: updatedSession.startedByUserId,
                startedAt: updatedSession.startedAt,
                endedAt: updatedSession.endedAt,
              }
            : session
        )
      );
      queueBackgroundRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar sessao.");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Cadastro de host</CardTitle>
          <CardDescription>
            Cadastro minimo para o MVP remoto. Perfis tecnicos podem registrar novos hosts por empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canCreateHosts ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isEditing ? "Edicao de host" : "Novo host"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O campo `RustDesk ID` e onde fica o identificador usado no link de acesso remoto.
                  </p>
                </div>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={resetHostForm} disabled={isPending}>
                    Cancelar
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {overview.companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do host</Label>
                <Input value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="ERP-MATRIZ-01" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Input value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="Producao" />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="RustDesk" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descricao operacional</Label>
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Servidor principal do ERP na matriz"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>RustDesk ID</Label>
                  <Input
                    value={agentExternalId}
                    onChange={(event) => setAgentExternalId(event.target.value)}
                    placeholder="123 456 789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={hostStatus} onValueChange={(value) => setHostStatus(value as "ACTIVE" | "INACTIVE" | "MAINTENANCE")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreateHost} disabled={isPending}>
                {isEditing ? "Salvar host" : "Criar host"}
              </Button>

              <div className="space-y-3 border-t border-border/50 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Hosts cadastrados</h3>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {recentHosts.length} recente(s)
                  </Badge>
                </div>

                {recentHosts.length ? (
                  recentHosts.map((host) => (
                    <div key={host.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{host.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {host.companyName ?? "Sem empresa"}
                            {host.environment ? ` | ${host.environment}` : ""}
                            {host.provider ? ` | ${host.provider}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {host.description ? `${host.description} | ` : ""}
                            RustDesk ID: {host.agentExternalId ?? "Nao configurado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Token instalacao: {host.installToken ?? "Nao gerado"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingHostId(host.id);
                              setSelectedCompanyId(host.companyId);
                              setHostName(host.name);
                              setEnvironment(host.environment ?? "");
                              setProvider(host.provider ?? "RustDesk");
                              setDescription(host.description ?? "");
                              setAgentExternalId(host.agentExternalId ?? "");
                              setHostStatus(host.status);
                            }}
                            disabled={isPending}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteHost(host.id, host.name)}
                            disabled={isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum host recente para editar ou excluir.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              `CLIENTE_ADMIN` nao cadastra hosts. O escopo deste perfil e consumir apenas os hosts ja vinculados a propria empresa.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Operacao de sessao remota</CardTitle>
          <CardDescription>
            Fluxo inicial de `FEAT-003`: solicitar sessao, iniciar e encerrar com persistencia de status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={sessionCompanyId}
                onValueChange={(value) => {
                  setSessionCompanyId(value);
                  setSelectedHostId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {overview.companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Host</Label>
              <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o host" />
                </SelectTrigger>
                <SelectContent>
                  {hostOptions.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      {host.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input
              value={sessionReason}
              onChange={(event) => setSessionReason(event.target.value)}
              placeholder="Suporte remoto para validacao do ambiente"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ticket ID</Label>
              <Input
                value={sessionTicketId}
                onChange={(event) => setSessionTicketId(event.target.value)}
                placeholder="12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Numero do ticket</Label>
              <Input
                value={sessionTicketNumber}
                onChange={(event) => setSessionTicketNumber(event.target.value)}
                placeholder="2026001234"
              />
            </div>
          </div>

          <Button onClick={handleCreateSession} disabled={isPending}>
            Solicitar sessao
          </Button>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Ultimas sessoes</h3>
              <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                {recentSessions.length} registro(s)
              </Badge>
            </div>

            {recentSessions.length ? (
              recentSessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.hostName}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.companyName ?? "Sem empresa"} | {session.status}
                      </p>
                      {session.ticketNumber && (
                        <p className="text-xs text-muted-foreground">Ticket #{session.ticketNumber}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                      {session.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {session.status === "REQUESTED" && (
                      <Button size="sm" onClick={() => handleSessionTransition(session.id, "start")} disabled={isPending}>
                        Iniciar
                      </Button>
                    )}
                    {session.status === "STARTED" && (
                      <Button size="sm" variant="secondary" onClick={() => handleSessionTransition(session.id, "stop")} disabled={isPending}>
                        Encerrar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sessao disponivel para operacao ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
