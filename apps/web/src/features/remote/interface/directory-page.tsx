"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  Download,
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

function buildOperationalSummary(item: DirectoryItem) {
  return [
    item.machineName ? `Maquina: ${item.machineName}` : null,
    item.agentVersion ? `Agente: ${item.agentVersion}` : null,
    item.lastHeartbeatAt ? `Heartbeat: ${new Date(item.lastHeartbeatAt).toLocaleString("pt-BR")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}


export function RemotePlatformDirectoryPanel({ directory }: { directory: RemotePlatformDirectory }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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

  async function handleCopyPowerShellCommand(item: DirectoryItem) {
    const command = [
      "powershell -ExecutionPolicy Bypass -File .\\scripts\\remote-agent-oss.ps1",
      `-PortalBaseUrl "${window.location.origin}"`,
      `-InstallToken "${item.installToken ?? ""}"`,
      item.rustdeskId ? `-RustDeskId "${item.rustdeskId}"` : null,
      `-MachineName "${item.name}"`,
    ]
      .filter(Boolean)
      .join(" ");

    if (!item.installToken) {
      toast.error("Host sem token de instalacao.");
      return;
    }

    try {
      await navigator.clipboard.writeText(command);
      toast.success("Comando PowerShell copiado.");
    } catch {
      toast.error("Falha ao copiar comando PowerShell.");
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Prontos para acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directoryStats.ready}</p>
            <p className="text-xs text-muted-foreground">Hosts com ID valido e heartbeat recente.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TimerReset className="h-4 w-4 text-amber-500" />
              Pedem verificacao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directoryStats.attention}</p>
            <p className="text-xs text-muted-foreground">Hosts com heartbeat antigo ou conectividade instavel.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-sky-500" />
              Em atendimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directoryStats.openSessions}</p>
            <p className="text-xs text-muted-foreground">Hosts com sessao aberta ou solicitacao ativa.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-rose-500" />
              Cadastro pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directoryStats.pendingSetup}</p>
            <p className="text-xs text-muted-foreground">Hosts sem token, sem RustDesk ID ou sem heartbeat inicial.</p>
          </CardContent>
        </Card>

        {canCreateHosts ? (
          <Card className="border-border/50 bg-linear-to-br from-background to-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-violet-500" />
                Maquinas em triagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{directory.stats.pendingDiscovery}</p>
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
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 lg:min-w-95">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cadastro rapido de host</p>
                    <p className="text-xs text-muted-foreground">
                      Fluxo minimo para criar um host operacional diretamente nesta rota.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setShowQuickCreate((current) => !current)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {showQuickCreate ? "Recolher" : "Cadastrar maquina"}
                  </Button>
                </div>

                {showQuickCreate ? (
                  <div className="mt-4 space-y-3">
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
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          {canCreateHosts ? (
            <div className="flex justify-end">
              <a
                href="/api/remote/agents/discovery-script"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                Baixar script padrao
              </a>
            </div>
          ) : null}

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
                <option value="recent">Recente</option>
                <option value="stale">Antigo</option>
                <option value="missing">Sem heartbeat</option>
              </select>

              <select
                value={agentFilter}
                onChange={(event) => setAgentFilter(event.target.value as typeof agentFilter)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">Qualquer agente</option>
                <option value="pending">Pendente de instalacao</option>
                <option value="linked">Agente vinculado</option>
                <option value="online">Heartbeat confirmado</option>
                <option value="stale">Heartbeat antigo/offline</option>
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
                  <p>2. Priorize cards marcados como `Pronto para acesso`.</p>
                  <p>3. Use `Acesso direto` para abrir o RustDesk no menor numero de cliques.</p>
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
                const rustdeskHref = item.rustdeskId ? `rustdesk://${item.rustdeskId.replace(/\s+/g, "")}` : null;
                const operationalSummary = buildOperationalSummary(item);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/50 bg-linear-to-r from-background via-background to-muted/20 p-5 shadow-sm transition-colors hover:border-primary/20"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.85fr_0.8fr]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={heartbeat.className}>
                            <HeartbeatIcon className="mr-1 h-3.5 w-3.5" />
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
                        </div>

                        <div className="space-y-3">
                          <p className="text-lg font-semibold text-foreground">{item.companyName ?? "Sem empresa"}</p>
                          {item.installationCompanies.length > 1 ? (
                            <p className="text-xs text-muted-foreground">
                              Instalacoes: {item.installationCompanies.join(" | ")}
                            </p>
                          ) : null}
                          <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/10">
                            <div className="grid grid-cols-[118px_1fr] gap-x-3 border-b border-border/40 px-3 py-2 text-sm">
                              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Descricao</span>
                              <span className="font-medium text-foreground">{item.description || "Sem descricao operacional."}</span>
                            </div>
                            <div className="grid grid-cols-[118px_1fr] gap-x-3 px-3 py-2 text-sm">
                              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Host</span>
                              <span className="text-foreground">{item.name}</span>
                            </div>
                          </div>
                          {operationalSummary ? (
                            <p className="text-xs text-muted-foreground">{operationalSummary}</p>
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
                              Acesso rapido
                            </a>
                          ) : null}
                          <Link
                            href={`/portal/plataforma-remota/${item.id}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Visualizar detalhes
                          </Link>
                          {canCreateHosts ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPowerShellCommand(item)}
                              className="justify-start gap-2 rounded-lg px-3 py-2"
                              disabled={!item.installToken}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copiar comando
                            </Button>
                          ) : null}
                          {canCreateHosts ? (
                            <a
                              href={item.agent.installerPath}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Baixar script
                            </a>
                          ) : null}
                        </div>
                      </div>
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


