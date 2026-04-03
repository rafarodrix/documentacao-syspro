"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Monitor,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  TimerReset,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RemotePlatformDirectory } from "@/features/remote/domain/model";
import {
  RemoteApiClientError,
  getRemoteApiErrorMessage,
  requestRemoteMutation,
} from "@/features/remote/interface/remote-api";

type DirectoryItem = RemotePlatformDirectory["items"][number];

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRustDeskId(value: string) {
  const compact = value.replace(/\s+/g, "").trim();
  if (!compact) return { normalized: null, isValid: true };
  if (!/^\d{7,12}$/.test(compact)) return { normalized: null, isValid: false };
  return { normalized: compact, isValid: true };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function getStatusLabel(status: "ACTIVE" | "MAINTENANCE" | "INACTIVE") {
  if (status === "ACTIVE") return "Ativo";
  if (status === "MAINTENANCE") return "Manutencao";
  return "Inativo";
}

function getHeartbeatMeta(lastHeartbeatAt: string | null) {
  if (!lastHeartbeatAt) {
    return {
      label: "Sem heartbeat",
      shortLabel: "Offline",
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      bucket: "missing" as const,
    };
  }

  const diffMinutes = Math.floor((Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000);
  if (diffMinutes <= 5) {
    return {
      label: "Heartbeat recente",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      bucket: "recent" as const,
    };
  }

  return {
    label: "Heartbeat antigo",
    shortLabel: "Instavel",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    bucket: "stale" as const,
  };
}

function getAgentTokenMeta(lastHeartbeatErrorMessage: string | null) {
  const normalized = lastHeartbeatErrorMessage?.toLowerCase() ?? "";

  if (normalized.includes("agenttoken expirado")) {
    return {
      label: "Credencial expirada",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken invalido") || normalized.includes("agenttoken rotacionado") || normalized.includes("agenttoken indisponivel")) {
    return {
      label: "Renovacao de credencial necessaria",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      needsBootstrap: true,
    };
  }

  return {
    label: "Agente operacional",
    className: "border-border/60 bg-background/70 text-muted-foreground",
    needsBootstrap: false,
  };
}

function getOperationalStateFilter(item: DirectoryItem) {
  if (item.bootstrapFlow === "token_invalid") return "token_invalid" as const;

  const bootstrapRequired =
    item.bootstrapFlow === "host_bootstrap_required" ||
    item.bootstrapFlow === "triagem_await_install_token" ||
    !item.installToken ||
    !item.rustdeskId ||
    item.agent.lifecycleStatus === "PENDING_INSTALL";
  if (bootstrapRequired) return "bootstrap_required" as const;

  const syncOk = item.operationalStatus === "ONLINE" || item.operationalStatus === "RECENT";
  if (syncOk) return "sync_ok" as const;

  return "other" as const;
}

async function copyTextWithFallback(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("copy_failed");
  }
}

export function RemotePlatformDirectoryPanel({ directory }: { directory: RemotePlatformDirectory }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "MAINTENANCE" | "INACTIVE">("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [heartbeatFilter, setHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
  const [agentFilter, setAgentFilter] = useState<"all" | "pending" | "linked" | "online" | "stale">("all");
  const [operationalFilter, setOperationalFilter] = useState<"all" | "token_invalid" | "bootstrap_required" | "sync_ok">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [pendingCompanyById, setPendingCompanyById] = useState<Record<string, string>>({});
  const [pendingNameById, setPendingNameById] = useState<Record<string, string>>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [latestQuickInstallToken, setLatestQuickInstallToken] = useState<{ hostName: string; token: string } | null>(null);
  const canCreateHosts = directory.tenantScope.role !== "CLIENTE_ADMIN";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
  }, []);

  const environmentOptions = useMemo(() => {
    const values = Array.from(new Set(directory.items.map((item) => item.environment).filter(Boolean))) as string[];
    return values.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [directory.items]);
  const commandObservability = directory.commandObservability;

  async function handleCopyRustDeskId(value: string | null) {
    if (!value) {
      toast.error("RustDesk ID nao configurado.");
      return;
    }

    try {
      await copyTextWithFallback(value);
      toast.success("RustDesk ID copiado.");
    } catch {
      toast.error("Falha ao copiar RustDesk ID.");
    }
  }

  async function handleQuickCreateHost() {
    if (!quickCompanyId || !quickRustdeskId.trim() || !quickDescription.trim()) {
      toast.error("Selecione a empresa, informe o RustDesk ID e a descricao.");
      return;
    }

    const rustdeskId = normalizeRustDeskId(quickRustdeskId);
    if (!rustdeskId.isValid || !rustdeskId.normalized) {
      toast.error("RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos.");
      return;
    }

    try {
      const companyLabel = directory.companyOptions.find((company) => company.id === quickCompanyId)?.label ?? "Host remoto";
      const name = `${companyLabel} - Acesso remoto`;
      const payload = await requestRemoteMutation<Record<string, unknown>>({
        url: "/api/remote/hosts",
        method: "POST",
        body: {
          companyId: quickCompanyId,
          name,
          provider: "RustDesk",
          description: quickDescription,
          agentExternalId: rustdeskId.normalized,
          status: "ACTIVE",
        },
      });

      const savedHost = payload.data as { name?: string | null; installToken?: string | null };
      if (savedHost?.installToken) {
        setLatestQuickInstallToken({
          hostName: savedHost.name?.trim() || name,
          token: savedHost.installToken,
        });
      }

      toast.success("Maquina cadastrada.");
      setQuickRustdeskId("");
      setQuickDescription("");
      setShowQuickCreate(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    }
  }

  async function handleLinkDiscoveredHost(id: string, fallbackName: string | null) {
    const companyId = pendingCompanyById[id] ?? directory.companyOptions[0]?.id ?? "";
    const name = (pendingNameById[id] ?? fallbackName ?? "").trim();

    if (!companyId || !name) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    const tryLink = () =>
      requestRemoteMutation({
        url: `/api/remote/discovered-hosts/${id}/link`,
        method: "POST",
        body: {
          companyId,
          name,
        },
      });

    try {
      await tryLink();

      toast.success("Maquina vinculada e convertida em host.");
      startTransition(() => router.refresh());
    } catch (error) {
      if (
        error instanceof RemoteApiClientError &&
        (error.httpStatus === 429 || error.code === "RATE_LIMITED")
      ) {
        toast("Limite temporario na triagem. Nova tentativa automatica em 5 segundos.");
        await delay(5000);
        try {
          await tryLink();
          toast.success("Maquina vinculada e convertida em host.");
          startTransition(() => router.refresh());
          return;
        } catch (retryError) {
          toast.error(getRemoteApiErrorMessage(retryError));
          return;
        }
      }

      toast.error(getRemoteApiErrorMessage(error));
    }
  }

  const filteredItems = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    return directory.items.filter((item) => {
      const haystack = normalizeSearchValue([
        item.name,
        item.companyName,
        item.installationCompanies.join(" "),
        item.environment,
        item.provider,
        item.rustdeskId,
        item.description,
        item.machineName,
        item.agentVersion,
        item.lastTicketNumber,
        item.lastSessionStatus,
        item.status,
        item.companyId,
      ]
        .filter(Boolean)
        .join(" "));

      const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
      const matchesSearch = !term || haystack.includes(term);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesEnvironment = environmentFilter === "all" || item.environment === environmentFilter;
      const matchesHeartbeat = heartbeatFilter === "all" || heartbeat.bucket === heartbeatFilter;
      const matchesAgent =
        agentFilter === "all" ||
        (agentFilter === "pending" && item.agent.lifecycleStatus === "PENDING_INSTALL") ||
        (agentFilter === "linked" &&
          (item.agent.lifecycleStatus === "INSTALLED" ||
            item.agent.lifecycleStatus === "ONLINE" ||
            item.agent.lifecycleStatus === "STALE" ||
            item.agent.lifecycleStatus === "UNLINKED")) ||
        (agentFilter === "online" && item.agent.lifecycleStatus === "ONLINE") ||
        (agentFilter === "stale" &&
          (item.agent.lifecycleStatus === "STALE" || item.agent.lifecycleStatus === "UNLINKED"));
      const operationalState = getOperationalStateFilter(item);
      const matchesOperational = operationalFilter === "all" || operationalState === operationalFilter;

      return matchesSearch && matchesStatus && matchesEnvironment && matchesHeartbeat && matchesAgent && matchesOperational;
    });
  }, [agentFilter, directory.items, environmentFilter, heartbeatFilter, operationalFilter, searchTerm, statusFilter]);

  const filteredPendingItems = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    return directory.pendingItems.filter((item) => {
      const haystack = normalizeSearchValue([
        item.machineName,
        item.rustdeskId,
        item.agentVersion,
        item.provider,
        item.environment,
        item.description,
        item.installationCompanies.join(" "),
      ]
        .filter(Boolean)
        .join(" "));

      return !term || haystack.includes(term);
    });
  }, [directory.pendingItems, searchTerm]);

  const directoryStats = useMemo(() => {
    const ready = directory.items.filter((item) => item.operationalStatus === "ONLINE").length;
    const attention = directory.items.filter((item) => item.operationalStatus === "RECENT").length;
    const openSessions = directory.items.filter((item) => item.operationalStatus === "SESSION_BUSY").length;
    const pendingSetup = directory.items.filter((item) => item.operationalStatus === "MISCONFIGURED").length;

    return { ready, attention, openSessions, pendingSetup };
  }, [directory.items]);

  const activeResultCount = filteredItems.length;
  const activePendingCount = filteredPendingItems.length;
  const filteredQuickIndicators = useMemo(() => {
    const online = filteredItems.filter((item) => getHeartbeatMeta(item.lastHeartbeatAt).bucket === "recent").length;
    const stale = filteredItems.filter((item) => getHeartbeatMeta(item.lastHeartbeatAt).bucket === "stale").length;
    const offline = filteredItems.filter((item) => getHeartbeatMeta(item.lastHeartbeatAt).bucket === "missing").length;
    const rebootPending = filteredItems.filter((item) => item.inventorySignals.rebootPending === true).length;
    return { online, stale, offline, rebootPending };
  }, [filteredItems]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-muted/10 p-3">
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <a
          href="/portal/configuracoes?tab=remote"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 sm:w-auto sm:justify-start"
        >
          <Settings className="h-4 w-4" />
          Configuracoes
        </a>

        {canCreateHosts ? (
          <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Cadastro rapido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastro rapido de host</DialogTitle>
                <DialogDescription>
                  Fluxo minimo para criar um host operacional diretamente nesta rota.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Select value={quickCompanyId} onValueChange={setQuickCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {directory.companyOptions.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>RustDesk ID</Label>
                    <Input value={quickRustdeskId} onChange={(event) => setQuickRustdeskId(event.target.value)} placeholder="21187620068" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descricao</Label>
                    <Input value={quickDescription} onChange={(event) => setQuickDescription(event.target.value)} placeholder="ERP matriz / servidor fiscal" />
                  </div>
                </div>
                <Button onClick={handleQuickCreateHost} disabled={isPending} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Confirmar cadastro
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O fluxo agora e 100% via integracao RustDesk. Faca a vinculacao das maquinas descobertas nesta tela e siga a vinculacao de maquina autenticada do agente.
        </p>
      </div>
      {latestQuickInstallToken ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            InstallToken gerado para {latestQuickInstallToken.hostName}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-amber-800 dark:text-amber-100">
            {latestQuickInstallToken.token}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await copyTextWithFallback(latestQuickInstallToken.token);
                  toast.success("InstallToken copiado.");
                } catch {
                  toast.error("Falha ao copiar installToken.");
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar installToken
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLatestQuickInstallToken(null)}>
              Fechar
            </Button>
          </div>
        </div>
      ) : null}

      <section className={cn("grid gap-3", canCreateHosts ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-2 xl:grid-cols-4")}>
        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Prontos para acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.ready}</p>
            <p className="text-[11px] text-muted-foreground">ID valido e heartbeat recente</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TimerReset className="h-4 w-4 text-amber-500" />
              Exigem revisao
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.attention}</p>
            <p className="text-[11px] text-muted-foreground">Heartbeat antigo ou sinais de instabilidade</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-sky-500" />
              Em atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.openSessions}</p>
            <p className="text-[11px] text-muted-foreground">Sessao aberta ou solicitacao ativa</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-rose-500" />
              Aguardam vinculacao de maquina
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.pendingSetup}</p>
            <p className="text-[11px] text-muted-foreground">Sem ciclo completo de agente e heartbeat</p>
          </CardContent>
        </Card>

        {canCreateHosts ? (
          <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
            <CardHeader className="pb-1 space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-violet-500" />
                Maquinas em triagem
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-foreground">{directory.stats.pendingDiscovery}</p>
              <p className="text-[11px] text-muted-foreground">Descobertas e aguardando vinculo</p>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fila de comandos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{commandObservability.pendingTotal}</p>
              <p className="text-[11px] text-muted-foreground">{commandObservability.pendingHosts} host(s) com backlog</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Falhas 24h</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{commandObservability.failedLast24h}</p>
              <p className="text-[11px] text-muted-foreground">Comandos encerrados com erro</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sucesso 24h</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{commandObservability.successRates.window24h}%</p>
              <p className="text-[11px] text-muted-foreground">Acks em relacao a entregas</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estrategia 24h</p>
              <p className="mt-1 text-sm text-foreground">
                sync direto: {commandObservability.orchestrationMix.window24h.syncTokenFirst}
              </p>
              <p className="text-[11px] text-muted-foreground">
                discover/bootstrap: {commandObservability.orchestrationMix.window24h.discoverBootstrap}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar empresa, host, instalacao, ambiente, ticket ou RustDesk ID"
                className="pl-9"
              />
            </div>

            <details className="mt-4 rounded-xl border border-border/50 bg-background/40 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Filtros avancados</summary>
              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Detalhados</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="ACTIVE">Ativo</SelectItem>
                          <SelectItem value="MAINTENANCE">Manutencao</SelectItem>
                          <SelectItem value="INACTIVE">Inativo</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os ambientes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os ambientes</SelectItem>
                          {environmentOptions.map((environment) => (
                            <SelectItem key={environment} value={environment}>
                              {environment}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={heartbeatFilter} onValueChange={(value) => setHeartbeatFilter(value as typeof heartbeatFilter)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer heartbeat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer heartbeat</SelectItem>
                          <SelectItem value="recent">Online agora</SelectItem>
                          <SelectItem value="stale">Antigo</SelectItem>
                          <SelectItem value="missing">Sem contato</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={agentFilter} onValueChange={(value) => setAgentFilter(value as typeof agentFilter)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer agente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer agente</SelectItem>
                          <SelectItem value="pending">Vinculacao pendente</SelectItem>
                          <SelectItem value="linked">Agente vinculado</SelectItem>
                          <SelectItem value="online">Heartbeat confirmado</SelectItem>
                          <SelectItem value="stale">Exige revisao</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={operationalFilter} onValueChange={(value) => setOperationalFilter(value as typeof operationalFilter)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado operacional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Estado operacional: todos</SelectItem>
                          <SelectItem value="token_invalid">Token invalido</SelectItem>
                          <SelectItem value="bootstrap_required">Bootstrap obrigatorio</SelectItem>
                          <SelectItem value="sync_ok">Sync OK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 xl:w-[220px]">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full">Fluxo operacional</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Roteiro rapido de atendimento</DialogTitle>
                        <DialogDescription>
                          Fluxo inspirado em softwares de suporte remoto: validar prontidao, entrar rapido e so abrir o detalhe quando precisar de mais contexto.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>1. Procure pela empresa ou pelo ticket.</p>
                        <p>2. Priorize cards marcados como `Online` ou com heartbeat recente.</p>
                        <p>3. Use `Acesso rapido` no desktop ou `Abrir no app` no celular.</p>
                        <p>4. Se o navegador bloquear, use `Copiar ID` e conecte manualmente.</p>
                        <p>5. Se houver alerta de sessao aberta ou heartbeat antigo, valide antes de prosseguir.</p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {searchTerm || statusFilter !== "all" || environmentFilter !== "all" || heartbeatFilter !== "all" || agentFilter !== "all" || operationalFilter !== "all" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setEnvironmentFilter("all");
                        setHeartbeatFilter("all");
                        setAgentFilter("all");
                        setOperationalFilter("all");
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Limpar filtros
                    </Button>
                  ) : null}
                </div>
              </div>
            </details>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/50 bg-muted/10 px-3 py-1">
              {activeResultCount} host(s) no diretorio
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              {filteredQuickIndicators.online} online
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
              {filteredQuickIndicators.stale} instavel
            </span>
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-rose-700 dark:text-rose-300">
              {filteredQuickIndicators.offline} sem contato
            </span>
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-red-700 dark:text-red-300">
              {filteredQuickIndicators.rebootPending} reboot pendente
            </span>
            {canCreateHosts ? (
              <span className="rounded-full border border-border/50 bg-muted/10 px-3 py-1">
                {activePendingCount} item(ns) em triagem
              </span>
            ) : null}
            {searchTerm || statusFilter !== "all" || environmentFilter !== "all" || heartbeatFilter !== "all" || agentFilter !== "all" || operationalFilter !== "all" ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                filtros ativos
              </span>
            ) : null}
          </div>

          {canCreateHosts && filteredPendingItems.length ? (
            <details className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4" open={false}>
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Maquinas pendentes de vinculacao</summary>
              <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="mt-1 text-xs text-muted-foreground">
                  Maquinas descobertas por onboarding do agente. Escolha a empresa e transforme cada uma em host operacional nesta mesma tela.
                </p>
              </div>

              {filteredPendingItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-amber-500/20 bg-linear-to-r from-background via-background to-amber-500/5 p-5 shadow-sm"
                >
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          Pendente
                        </Badge>
                        {item.environment ? (
                          <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                            {item.environment}
                          </Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{item.machineName ?? "Maquina sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          RustDesk ID: {item.rustdeskId ?? "Nao informado"}
                          {item.agentVersion ? ` | Agente: ${item.agentVersion}` : ""}
                          {item.lastHeartbeatAt ? ` | Heartbeat: ${new Date(item.lastHeartbeatAt).toLocaleString("pt-BR")}` : ""}
                        </p>
                      </div>
                      {item.installationCompanies.length ? (
                        <p className="text-sm text-muted-foreground">
                          Instalacoes detectadas: {item.installationCompanies.join(" | ")}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma instalacao detectada ainda no heartbeat.</p>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <Select
                        value={pendingCompanyById[item.id] ?? directory.companyOptions[0]?.id ?? ""}
                        onValueChange={(value) =>
                          setPendingCompanyById((current) => ({ ...current, [item.id]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {directory.companyOptions.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={pendingNameById[item.id] ?? item.machineName ?? ""}
                        onChange={(event) =>
                          setPendingNameById((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder="Nome do host"
                      />
                      <Button type="button" onClick={() => handleLinkDiscoveredHost(item.id, item.machineName)}>
                        Vincular
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </details>
          ) : null}

          {filteredItems.length ? (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
                const agentToken = getAgentTokenMeta(item.lastHeartbeatErrorMessage);
                const rustdeskHref = item.rustdeskId ? `rustdesk://${item.rustdeskId.replace(/\s+/g, "")}` : null;
                const installationNames = item.installationCompanies.length
                  ? item.installationCompanies
                    : item.companyName
                    ? [item.companyName]
                    : [];

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/55 bg-background/45 p-4 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/20 hover:bg-muted/10"
                  >
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={heartbeat.className}>
                            {heartbeat.shortLabel}
                          </Badge>
                          <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                            {getStatusLabel(item.status)}
                          </Badge>
                          {item.environment ? (
                            <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                              {item.environment}
                            </Badge>
                          ) : null}
                          {agentToken.needsBootstrap ? (
                            <Badge variant="outline" className={agentToken.className}>
                              {agentToken.label}
                            </Badge>
                          ) : null}
                          {item.inventorySignals.rebootPending === true ? (
                            <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300">
                              Reboot pendente
                            </Badge>
                          ) : null}
                          {item.inventorySignals.diskLow ? (
                            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              Disco baixo
                            </Badge>
                          ) : null}
                          {item.inventorySignals.sysproProcessDown ? (
                            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              Processo Syspro parado
                            </Badge>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                          {installationNames.length ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Empresas:</span>
                              {installationNames.slice(0, 2).map((installationName, installationIndex) => (
                                <Badge
                                  key={`${item.id}-installation-${installationIndex}-${installationName}`}
                                  variant="outline"
                                  className="border-border/55 bg-background/70 text-xs text-foreground"
                                >
                                  {installationName}
                                </Badge>
                              ))}
                              {installationNames.length > 2 ? (
                                <Badge variant="outline" className="border-border/55 bg-background/70 text-xs text-muted-foreground">
                                  +{installationNames.length - 2}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Sem empresa reportada no heartbeat.</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                              Contato: {item.lastHeartbeatAt ? new Date(item.lastHeartbeatAt).toLocaleString("pt-BR") : "Sem contato"}
                            </span>
                            <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                              Sessao: {item.lastSessionStatus ?? "Nenhuma"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
                        <div className="flex items-center gap-1.5 rounded-lg border border-border/55 bg-muted/10 p-1">
                          <code className="min-w-0 flex-1 truncate px-2 text-sm text-foreground">
                            {item.rustdeskId ?? "Nao configurado"}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyRustDeskId(item.rustdeskId)}
                            disabled={!item.rustdeskId}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            aria-label="Copiar RustDesk ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                        {rustdeskHref ? (
                          <a
                            href={rustdeskHref}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/35"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {isMobileClient ? "Abrir app" : "Acesso"}
                          </a>
                        ) : null}
                        <Link
                          href={`/portal/plataforma-remota/${item.id}`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/35"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Detalhes
                        </Link>
                      </div>

                      {isMobileClient ? (
                        <p className="text-xs text-muted-foreground lg:col-span-3">
                          Se o app RustDesk nao abrir automaticamente, copie o ID e conecte manualmente.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                        Maquina: {item.machineName ?? "Sem leitura"}
                      </span>
                      <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                        Provider: {item.provider ?? "Sem registro"}
                      </span>
                      <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                        Ticket: {item.lastTicketNumber ?? "Sem ticket"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !filteredPendingItems.length ? (
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? `Nenhum host deste modulo corresponde a "${searchTerm}".`
                : "Nenhum host remoto operacional configurado no seu escopo."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

