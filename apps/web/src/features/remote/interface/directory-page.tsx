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
  ShieldCheck,
  TimerReset,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      icon: WifiOff,
    };
  }

  const diffMinutes = Math.floor((Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000);
  if (diffMinutes <= 5) {
    return {
      label: "Heartbeat recente",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      bucket: "recent" as const,
      icon: Wifi,
    };
  }

  return {
    label: "Heartbeat antigo",
    shortLabel: "Instavel",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    bucket: "stale" as const,
    icon: WifiOff,
  };
}

function getAgentTokenMeta(lastHeartbeatErrorMessage: string | null) {
  const normalized = lastHeartbeatErrorMessage?.toLowerCase() ?? "";

  if (
    normalized.includes("agenttoken invalido") ||
    normalized.includes("agenttoken expirado") ||
    normalized.includes("agenttoken rotacionado") ||
    normalized.includes("agenttoken indisponivel")
  ) {
    return {
      label: "Rebootstrap necessario",
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

export function RemotePlatformDirectoryPanel({ directory }: { directory: RemotePlatformDirectory }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "MAINTENANCE" | "INACTIVE">("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [heartbeatFilter, setHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
  const [agentFilter, setAgentFilter] = useState<"all" | "pending" | "linked" | "online" | "stale">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [pendingCompanyById, setPendingCompanyById] = useState<Record<string, string>>({});
  const [pendingNameById, setPendingNameById] = useState<Record<string, string>>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
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

  async function handleCopyRustDeskId(value: string | null) {
    if (!value) {
      toast.error("RustDesk ID nao configurado.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
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

    try {
      const companyLabel = directory.companyOptions.find((company) => company.id === quickCompanyId)?.label ?? "Host remoto";
      const name = `${companyLabel} - Acesso remoto`;
      const response = await fetch("/api/remote/hosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: quickCompanyId,
          name,
          provider: "RustDesk",
          description: quickDescription,
          agentExternalId: quickRustdeskId,
          status: "ACTIVE",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao cadastrar maquina.");
      }

      toast.success("Maquina cadastrada.");
      setQuickRustdeskId("");
      setQuickDescription("");
      setShowQuickCreate(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar maquina.");
    }
  }

  async function handleLinkDiscoveredHost(id: string, fallbackName: string | null) {
    const companyId = pendingCompanyById[id] ?? directory.companyOptions[0]?.id ?? "";
    const name = (pendingNameById[id] ?? fallbackName ?? "").trim();

    if (!companyId || !name) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    try {
      const response = await fetch(`/api/remote/discovered-hosts/${id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao vincular maquina descoberta.");
      }

      toast.success("Maquina vinculada e convertida em host.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular maquina.");
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

      return matchesSearch && matchesStatus && matchesEnvironment && matchesHeartbeat && matchesAgent;
    });
  }, [agentFilter, directory.items, environmentFilter, heartbeatFilter, searchTerm, statusFilter]);

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

  return (
    <div className="space-y-6">
      <section className={cn("grid gap-3", canCreateHosts ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-4")}>
        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Prontos para acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.ready}</p>
            <p className="text-xs text-muted-foreground">Hosts com ID valido e heartbeat recente.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TimerReset className="h-4 w-4 text-amber-500" />
              Exigem revisao
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.attention}</p>
            <p className="text-xs text-muted-foreground">Hosts com heartbeat antigo ou sinais de instabilidade.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-sky-500" />
              Em atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.openSessions}</p>
            <p className="text-xs text-muted-foreground">Hosts com sessao aberta ou solicitacao ativa.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-rose-500" />
              Aguardam bootstrap
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-foreground">{directoryStats.pendingSetup}</p>
            <p className="text-xs text-muted-foreground">Hosts ainda sem ciclo completo de agente e heartbeat.</p>
          </CardContent>
        </Card>

        {canCreateHosts ? (
          <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-violet-500" />
                Maquinas em triagem
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-foreground">{directory.stats.pendingDiscovery}</p>
              <p className="text-xs text-muted-foreground">Descobertas pelo script padrao e aguardando vinculo.</p>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-linear-to-r from-background via-muted/10 to-background">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Centro operacional de acesso remoto</CardTitle>
              <CardDescription>
                Use esta tela para operar o modulo remoto: cadastrar hosts, vincular maquinas descobertas, acompanhar heartbeat e abrir o acesso com contexto tecnico.
              </CardDescription>
            </div>

            {canCreateHosts ? (
              <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2 self-start">
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
                        <select
                          value={quickCompanyId}
                          onChange={(event) => setQuickCompanyId(event.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        >
                          {directory.companyOptions.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.label}
                            </option>
                          ))}
                        </select>
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
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar empresa, host, instalacao, ambiente, ticket ou RustDesk ID"
                className="pl-9"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="MAINTENANCE">Manutencao</option>
                <option value="INACTIVE">Inativo</option>
              </select>

              <select
                value={environmentFilter}
                onChange={(event) => setEnvironmentFilter(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">Todos os ambientes</option>
                {environmentOptions.map((environment) => (
                  <option key={environment} value={environment}>
                    {environment}
                  </option>
                ))}
              </select>

              <select
                value={heartbeatFilter}
                onChange={(event) => setHeartbeatFilter(event.target.value as typeof heartbeatFilter)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">Qualquer heartbeat</option>
                <option value="recent">Online agora</option>
                <option value="stale">Antigo</option>
                <option value="missing">Sem contato</option>
              </select>

              <select
                value={agentFilter}
                onChange={(event) => setAgentFilter(event.target.value as typeof agentFilter)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">Qualquer agente</option>
                <option value="pending">Bootstrap pendente</option>
                <option value="linked">Agente vinculado</option>
                <option value="online">Heartbeat confirmado</option>
                <option value="stale">Exige revisao</option>
              </select>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">Fluxo operacional</Button>
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

            {searchTerm || statusFilter !== "all" || environmentFilter !== "all" || heartbeatFilter !== "all" || agentFilter !== "all" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setEnvironmentFilter("all");
                  setHeartbeatFilter("all");
                  setAgentFilter("all");
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/50 bg-muted/10 px-3 py-1">
              {activeResultCount} host(s) no diretorio
            </span>
            {canCreateHosts ? (
              <span className="rounded-full border border-border/50 bg-muted/10 px-3 py-1">
                {activePendingCount} item(ns) em triagem
              </span>
            ) : null}
            {searchTerm || statusFilter !== "all" || environmentFilter !== "all" || heartbeatFilter !== "all" || agentFilter !== "all" ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                filtros ativos
              </span>
            ) : null}
          </div>

          {canCreateHosts && filteredPendingItems.length ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-foreground">Maquinas pendentes de vinculacao</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Maquinas que chegaram pelo script padrao. Escolha a empresa e transforme cada uma em host operacional nesta mesma tela.
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
                      <select
                        value={pendingCompanyById[item.id] ?? directory.companyOptions[0]?.id ?? ""}
                        onChange={(event) =>
                          setPendingCompanyById((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      >
                        {directory.companyOptions.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.label}
                          </option>
                        ))}
                      </select>
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
          ) : null}

          {filteredItems.length ? (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
                const HeartbeatIcon = heartbeat.icon;
                const agentToken = getAgentTokenMeta(item.lastHeartbeatErrorMessage);
                const rustdeskHref = item.rustdeskId ? `rustdesk://${item.rustdeskId.replace(/\s+/g, "")}` : null;
                const companyLine = item.installationCompanies.length
                  ? item.installationCompanies.join(" | ")
                  : item.companyName ?? "Sem empresa";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/50 bg-linear-to-r from-background via-background to-muted/20 p-5 shadow-sm transition-colors hover:border-primary/20"
                  >
                    <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr_0.7fr]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={heartbeat.className}>
                            <HeartbeatIcon className="mr-1 h-3.5 w-3.5" />
                            {heartbeat.shortLabel}
                          </Badge>
                          <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                            {getStatusLabel(item.status)}
                          </Badge>
                          {agentToken.needsBootstrap ? (
                            <Badge variant="outline" className={agentToken.className}>
                              {agentToken.label}
                            </Badge>
                          ) : null}
                          {item.environment ? (
                            <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                              {item.environment}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-foreground">{companyLine}</p>
                          <p className="text-sm text-muted-foreground">
                            Maquina: {item.machineName ?? item.name}
                          </p>
                          {agentToken.needsBootstrap ? (
                            <p className="text-xs text-rose-600 dark:text-rose-300">
                              O agentToken deste host precisa de novo bootstrap antes do proximo heartbeat valido.
                            </p>
                          ) : null}
                          {item.installationCompanies.length > 1 ? (
                            <p className="text-xs text-muted-foreground">
                              Multiplas empresas vinculadas nesta maquina.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
                          <p className="mt-1 font-mono text-sm text-foreground">{item.rustdeskId ?? "Nao configurado"}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyRustDeskId(item.rustdeskId)}
                          className="w-full justify-start gap-2"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar RustDesk ID
                        </Button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="space-y-1 rounded-xl border border-border/50 bg-muted/10 p-1">
                          {rustdeskHref ? (
                            <a
                              href={rustdeskHref}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {isMobileClient ? "Abrir no app" : "Acesso rapido"}
                            </a>
                          ) : null}
                          <Link
                            href={`/portal/plataforma-remota/${item.id}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Visualizar detalhes
                          </Link>
                        </div>
                      </div>

                      {isMobileClient ? (
                        <p className="text-xs text-muted-foreground xl:col-span-3">
                          No celular, use `Abrir no app`. Se o RustDesk nao abrir automaticamente, copie o ID e cole manualmente no aplicativo.
                          {agentToken.needsBootstrap ? " Se o card pedir rebootstrap, abra os detalhes antes de tentar o acesso." : ""}
                        </p>
                      ) : null}
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


