"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RemotePlatformOverview } from "@/features/remote/domain/model";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";

type Props = {
  overview: RemotePlatformOverview;
};

function normalizeRustDeskId(value: string) {
  const compact = value.replace(/\s+/g, "").trim();
  if (!compact) return { normalized: null, isValid: true };
  if (!/^\d{7,12}$/.test(compact)) return { normalized: null, isValid: false };
  return { normalized: compact, isValid: true };
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
  const [notes, setNotes] = useState("");
  const [agentExternalId, setAgentExternalId] = useState("");
  const [hostStatus, setHostStatus] = useState<"ACTIVE" | "INACTIVE" | "MAINTENANCE">("ACTIVE");
  const [editingHostId, setEditingHostId] = useState("");
  const [selectedHostId, setSelectedHostId] = useState("");
  const [sessionCompanyId, setSessionCompanyId] = useState(overview.companyOptions[0]?.id ?? "");
  const [sessionTicketId, setSessionTicketId] = useState("");
  const [sessionTicketNumber, setSessionTicketNumber] = useState("");
  const [sessionReason, setSessionReason] = useState("");
  const [hostSearchTerm, setHostSearchTerm] = useState("");
  const [hostStatusFilter, setHostStatusFilter] = useState<"all" | "ACTIVE" | "MAINTENANCE" | "INACTIVE">("all");
  const [hostHeartbeatFilter, setHostHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
  const [recentHosts, setRecentHosts] = useState(overview.recentHosts);
  const [recentSessions, setRecentSessions] = useState(overview.recentSessions);
  const [hostOptionsState, setHostOptionsState] = useState(overview.hostOptions);
  const [latestInstallToken, setLatestInstallToken] = useState<{ hostName: string; token: string } | null>(null);

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

  function getHeartbeatMeta(lastHeartbeatAt: string | null) {
    if (!lastHeartbeatAt) {
      return {
        label: "Sem heartbeat",
        className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
        bucket: "missing" as const,
        icon: WifiOff,
      };
    }

    const diffMinutes = Math.floor((Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000);
    if (diffMinutes <= 5) {
      return {
        label: "Recente",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        bucket: "recent" as const,
        icon: Wifi,
      };
    }

    return {
      label: "Antigo",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
      bucket: "stale" as const,
      icon: WifiOff,
    };
  }

  function getStatusLabel(status: "ACTIVE" | "INACTIVE" | "MAINTENANCE") {
    if (status === "ACTIVE") return "Ativo";
    if (status === "MAINTENANCE") return "Manutencao";
    return "Inativo";
  }

  function getReadinessLabel(host: (typeof recentHosts)[number]) {
    if (!host.agentExternalId) return "Sem RustDesk ID";
    const heartbeat = getHeartbeatMeta(host.lastHeartbeatAt);
    if (heartbeat.bucket === "recent") return "Pronto para acesso";
    if (heartbeat.bucket === "stale") return "Heartbeat antigo";
    return "Sem heartbeat";
  }

  function getSessionStatusMeta(status: (typeof recentSessions)[number]["status"]) {
    if (status === "REQUESTED") {
      return {
        label: "Solicitada",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    }
    if (status === "STARTED") {
      return {
        label: "Em andamento",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    }
    if (status === "ENDED") {
      return {
        label: "Encerrada",
        className: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      };
    }
    if (status === "FAILED") {
      return {
        label: "Falhou",
        className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      };
    }
    return {
      label: "Cancelada",
      className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    };
  }

  function getSessionNextStep(session: (typeof recentSessions)[number]) {
    if (session.status === "REQUESTED") {
      return "Iniciar a sessao quando o acesso remoto estiver liberado no atendimento.";
    }
    if (session.status === "STARTED") {
      return "Encerrar a sessao assim que concluir a validacao ou suporte tecnico.";
    }
    if (session.status === "ENDED") {
      return "Sessao concluida. Validar comentario interno e encerramento operacional.";
    }
    if (session.status === "FAILED") {
      return "Revisar ticket, host e conectividade antes de abrir uma nova solicitacao.";
    }
    return "Sessao cancelada. Abra uma nova solicitacao se ainda houver necessidade de acesso.";
  }

  function getSessionOperationalAlerts(session: (typeof recentSessions)[number]) {
    const alerts: string[] = [];

    if (!session.ticketNumber && !session.ticketId) {
      alerts.push("Sem ticket vinculado");
    }
    if (session.status === "REQUESTED") {
      alerts.push("Aguardando inicio");
    }
    if (session.status === "STARTED") {
      alerts.push("Sessao em andamento");
    }

    return alerts;
  }

  async function handleCopy(value: string | null, label: string) {
    if (!value) {
      toast.error(`${label} nao configurado.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Falha ao copiar ${label.toLowerCase()}.`);
    }
  }

  const filteredRecentHosts = useMemo(() => {
    const term = hostSearchTerm.trim().toLowerCase();
    return recentHosts.filter((host) => {
      const haystack = [
        host.name,
        host.companyName,
        host.environment,
        host.provider,
        host.description,
        host.notes,
        host.agentExternalId,
        host.machineName,
        host.agentVersion,
        host.installToken,
        host.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const heartbeat = getHeartbeatMeta(host.lastHeartbeatAt);
      const matchesSearch = !term || haystack.includes(term);
      const matchesStatus = hostStatusFilter === "all" || host.status === hostStatusFilter;
      const matchesHeartbeat = hostHeartbeatFilter === "all" || heartbeat.bucket === hostHeartbeatFilter;

      return matchesSearch && matchesStatus && matchesHeartbeat;
    });
  }, [hostHeartbeatFilter, hostSearchTerm, hostStatusFilter, recentHosts]);

  function resetHostForm() {
    setEditingHostId("");
    setSelectedCompanyId(overview.companyOptions[0]?.id ?? "");
    setHostName("");
    setEnvironment("");
    setProvider("RustDesk");
    setDescription("");
    setNotes("");
    setAgentExternalId("");
    setHostStatus("ACTIVE");
  }

  async function handleCreateHost() {
    if (!selectedCompanyId || !hostName.trim()) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    const rustdeskId = normalizeRustDeskId(agentExternalId);
    if (!rustdeskId.isValid) {
      toast.error("RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos.");
      return;
    }

    try {
      const payload = await requestRemoteMutation<Record<string, unknown>>({
        url: isEditing ? `/api/remote/hosts/${editingHostId}` : "/api/remote/hosts",
        method: isEditing ? "PATCH" : "POST",
        body: {
          companyId: selectedCompanyId,
          name: hostName,
          environment,
          provider,
          description,
          notes,
          agentExternalId: rustdeskId.normalized,
          status: hostStatus,
        },
      });
      const savedHost = payload.data as {
        id: string;
        companyId: string;
        name: string;
        environment: string | null;
        provider: string | null;
        description: string | null;
        notes: string | null;
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
        notes: savedHost.notes,
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
      if (!isEditing && savedHost.installToken) {
        setLatestInstallToken({ hostName: savedHost.name, token: savedHost.installToken });
      }
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
      toast.error(getRemoteApiErrorMessage(error));
    }
  }

  async function handleDeleteHost(hostId: string, hostNameValue: string) {
    if (!window.confirm(`Excluir o host "${hostNameValue}"?`)) {
      return;
    }

    try {
      await requestRemoteMutation({
        url: `/api/remote/hosts/${hostId}`,
        method: "DELETE",
      });

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
      toast.error(getRemoteApiErrorMessage(error));
    }
  }

  async function handleCreateSession() {
    if (!sessionCompanyId || !selectedHostId) {
      toast.error("Selecione empresa e host.");
      return;
    }

    try {
      const payload = await requestRemoteMutation<Record<string, unknown>>({
        url: "/api/remote/sessions",
        method: "POST",
        body: {
          companyId: sessionCompanyId,
          hostId: selectedHostId,
          ticketId: sessionTicketId,
          ticketNumber: sessionTicketNumber,
          reason: sessionReason,
        },
      });
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
      toast.error(getRemoteApiErrorMessage(error));
    }
  }

  async function handleSessionTransition(sessionId: string, action: "start" | "stop") {
    try {
      const payload = await requestRemoteMutation<Record<string, unknown>>({
        url: `/api/remote/sessions/${sessionId}/${action}`,
        method: "POST",
      });
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
      toast.error(getRemoteApiErrorMessage(error));
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

              {latestInstallToken ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    InstallToken gerado para {latestInstallToken.hostName}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-amber-800 dark:text-amber-100">
                    {latestInstallToken.token}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(latestInstallToken.token, "InstallToken")}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar installToken
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLatestInstallToken(null)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : null}

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

              <div className="space-y-2">
                <Label>Observacoes do host</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Senha atendida pelo cliente, janela ideal de acesso, alerta operacional ou anotacoes manuais."
                  rows={4}
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
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="MAINTENANCE">Manutencao</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
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
                    {filteredRecentHosts.length} visivel(is)
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={hostSearchTerm}
                    onChange={(event) => setHostSearchTerm(event.target.value)}
                    placeholder="Pesquisar host, empresa ou RustDesk ID"
                  />
                  <select
                    value={hostStatusFilter}
                    onChange={(event) => setHostStatusFilter(event.target.value as typeof hostStatusFilter)}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="all">Todos os status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="MAINTENANCE">Manutencao</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                  <select
                    value={hostHeartbeatFilter}
                    onChange={(event) => setHostHeartbeatFilter(event.target.value as typeof hostHeartbeatFilter)}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="all">Qualquer heartbeat</option>
                    <option value="recent">Recente</option>
                    <option value="stale">Antigo</option>
                    <option value="missing">Sem heartbeat</option>
                  </select>
                </div>

                {filteredRecentHosts.length ? (
                  filteredRecentHosts.map((host) => {
                    const heartbeat = getHeartbeatMeta(host.lastHeartbeatAt);
                    const HeartbeatIcon = heartbeat.icon;
                    const readinessLabel = getReadinessLabel(host);

                    return (
                    <div key={host.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{host.name}</p>
                            <Badge variant="outline" className={heartbeat.className}>
                              <HeartbeatIcon className="mr-1 h-3.5 w-3.5" />
                              {heartbeat.label}
                            </Badge>
                            <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                              {readinessLabel}
                            </Badge>
                            <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                              {getStatusLabel(host.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {host.companyName ?? "Sem empresa"}
                            {host.environment ? ` | ${host.environment}` : ""}
                            {host.provider ? ` | ${host.provider}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {host.description ? `${host.description} | ` : ""}
                            RustDesk ID: {host.agentExternalId ?? "Nao configurado"}
                          </p>
                          {host.notes ? (
                            <p className="text-xs text-muted-foreground">Observacoes do host: {host.notes}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Token instalacao: {host.installToken ?? "Nao gerado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Agente: {host.machineName ?? "maquina indefinida"}
                            {host.agentVersion ? ` | versao ${host.agentVersion}` : ""}
                            {host.lastHeartbeatAt ? ` | heartbeat ${new Date(host.lastHeartbeatAt).toLocaleString("pt-BR")}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(host.agentExternalId ?? null, "RustDesk ID")}
                            disabled={isPending}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar ID
                          </Button>
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
                              setNotes(host.notes ?? "");
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
                  )})
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum host corresponde aos filtros atuais.</p>
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
              recentSessions.map((session) => {
                const statusMeta = getSessionStatusMeta(session.status);
                const alerts = getSessionOperationalAlerts(session);
                const nextStep = getSessionNextStep(session);

                return (
                  <div key={session.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{session.hostName}</p>
                          <Badge variant="outline" className={statusMeta.className}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.companyName ?? "Sem empresa"}
                          {session.requestedByName ? ` | solicitado por ${session.requestedByName}` : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="bg-background/80 text-foreground">
                            Ultimo ticket: {session.ticketNumber ? `#${session.ticketNumber}` : "Nao informado"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Solicitada em {new Date(session.createdAt).toLocaleString("pt-BR")}
                          </span>
                          {session.startedAt ? (
                            <span className="text-xs text-muted-foreground">
                              Inicio {new Date(session.startedAt).toLocaleString("pt-BR")}
                            </span>
                          ) : null}
                          {session.endedAt ? (
                            <span className="text-xs text-muted-foreground">
                              Encerrada em {new Date(session.endedAt).toLocaleString("pt-BR")}
                            </span>
                          ) : null}
                        </div>
                        {alerts.length ? (
                          <div className="flex flex-wrap gap-2">
                            {alerts.map((alert) => (
                              <Badge
                                key={alert}
                                variant="outline"
                                className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              >
                                {alert}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-md border border-border/50 bg-background/70 px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proximo passo</p>
                        <p className="max-w-xs text-sm text-foreground">{nextStep}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {session.status === "REQUESTED" ? (
                        <>
                          <Button size="sm" onClick={() => handleSessionTransition(session.id, "start")} disabled={isPending}>
                            Iniciar sessao
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Bloqueio: apenas sessoes solicitadas podem ser iniciadas.
                          </span>
                        </>
                      ) : null}
                      {session.status === "STARTED" ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => handleSessionTransition(session.id, "stop")} disabled={isPending}>
                            Encerrar sessao
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Bloqueio: apenas sessoes em andamento podem ser encerradas.
                          </span>
                        </>
                      ) : null}
                      {session.status !== "REQUESTED" && session.status !== "STARTED" ? (
                        <span className="text-xs text-muted-foreground">
                          Esta sessao nao permite nova transicao manual no fluxo atual.
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sessao disponivel para operacao ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}




