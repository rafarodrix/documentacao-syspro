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
  Wrench,
  X,
  Activity,
  Zap,
  LayoutDashboard,
  Filter,
  Cpu,
  Building2,
  Clock,
  Ticket,
  RefreshCw,
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
import { getRemoteProductStatusMeta } from "@/features/remote/domain";
import {
  RemoteApiClientError,
  getRemoteApiErrorMessage,
  requestRemoteMutation,
} from "@/features/remote/interface/remote-api";
import { SearchableCompanyPicker } from "./host-details/components/SearchableCompanyPicker";

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

const QUICK_DESCRIPTION_TEMPLATES = [
  "ERP matriz / servidor fiscal",
  "Servidor principal do cliente",
  "Terminal de suporte financeiro",
  "Estacao do faturamento",
  "Servidor de aplicacao",
  "PDV / caixa operacional",
];

const QUICK_ENVIRONMENT_TEMPLATES = [
  "Producao",
  "Homologacao",
  "Servidor",
  "Matriz",
  "Filial",
  "Terminal",
];

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

function getOperationalStateFilter(item: DirectoryItem) {
  if (item.productStatus === "ATTENTION_REQUIRED") return "attention_required" as const;
  if (item.productStatus === "AWAITING_LINK" || item.productStatus === "PROVISIONING_REMOTE") {
    return "provisioning" as const;
  }
  if (item.productStatus === "REMOTE_READY") return "ready" as const;
  if (item.productStatus === "IN_SERVICE") return "in_service" as const;
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
  const [agentFilter, setAgentFilter] = useState<"all" | "awaiting_link" | "provisioning" | "ready" | "attention" | "in_service">("all");
  const [operationalFilter, setOperationalFilter] = useState<"all" | "attention_required" | "provisioning" | "ready" | "in_service">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickHostName, setQuickHostName] = useState("");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickEnvironment, setQuickEnvironment] = useState("Producao");
  const [quickDescription, setQuickDescription] = useState("");
  const [pendingCompanyById, setPendingCompanyById] = useState<Record<string, string>>({});
  const [pendingNameById, setPendingNameById] = useState<Record<string, string>>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    if (!quickCompanyId || !quickHostName.trim() || !quickRustdeskId.trim() || !quickDescription.trim()) {
      toast.error("Selecione a empresa e informe nome do host, RustDesk ID e descricao.");
      return;
    }

    const rustdeskId = normalizeRustDeskId(quickRustdeskId);
    if (!rustdeskId.isValid || !rustdeskId.normalized) {
      toast.error("RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos.");
      return;
    }

    try {
      const payload = await requestRemoteMutation<Record<string, unknown>>({
        url: "/api/remote/hosts",
        method: "POST",
        body: {
          companyId: quickCompanyId,
          name: quickHostName.trim(),
          provider: "RustDesk",
          environment: quickEnvironment.trim() || "Producao",
          description: quickDescription.trim(),
          agentExternalId: rustdeskId.normalized,
          status: "ACTIVE",
        },
      });

      toast.success("Maquina cadastrada.");
      setQuickHostName("");
      setQuickRustdeskId("");
      setQuickEnvironment("Producao");
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
        (agentFilter === "awaiting_link" && item.productStatus === "AWAITING_LINK") ||
        (agentFilter === "provisioning" && item.productStatus === "PROVISIONING_REMOTE") ||
        (agentFilter === "ready" && item.productStatus === "REMOTE_READY") ||
        (agentFilter === "attention" && item.productStatus === "ATTENTION_REQUIRED") ||
        (agentFilter === "in_service" && item.productStatus === "IN_SERVICE");
      const operationalState = getOperationalStateFilter(item);
      const matchesOperational = operationalFilter === "all" || operationalState === operationalFilter;

      return matchesSearch && matchesStatus && matchesEnvironment && matchesHeartbeat && matchesAgent && matchesOperational;
    });
  }, [agentFilter, directory.items, environmentFilter, heartbeatFilter, operationalFilter, searchTerm, statusFilter]);

  const filteredPendingItems = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    return directory.pendingItems
      .filter((item) => {
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
      })
      .sort((a, b) => {
        const aHeartbeat = a.lastHeartbeatAt ? Date.parse(a.lastHeartbeatAt) : 0;
        const bHeartbeat = b.lastHeartbeatAt ? Date.parse(b.lastHeartbeatAt) : 0;
        if (aHeartbeat !== bHeartbeat) {
          return bHeartbeat - aHeartbeat;
        }
        return (a.machineName ?? "").localeCompare(b.machineName ?? "", "pt-BR");
      });
  }, [directory.pendingItems, searchTerm]);

  const directoryStats = useMemo(() => {
    const ready = directory.items.filter((item) => item.productStatus === "REMOTE_READY").length;
    const attention = directory.items.filter((item) => item.productStatus === "ATTENTION_REQUIRED").length;
    const openSessions = directory.items.filter((item) => item.productStatus === "IN_SERVICE").length;
    const pendingSetup = directory.items.filter((item) => item.productStatus === "PROVISIONING_REMOTE").length;

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
  const operationalObservability = useMemo(() => {
    const hostsWithBootstrapRate = filteredItems.filter((item) => typeof item.bootstrapRate24hPct === "number");
    const bootstrapRateAvg = hostsWithBootstrapRate.length
      ? Math.round(
          (hostsWithBootstrapRate.reduce((sum, item) => sum + (item.bootstrapRate24hPct ?? 0), 0) / hostsWithBootstrapRate.length) * 10
        ) / 10
      : null;

    const pendingAckQueueTotal = filteredItems.reduce((sum, item) => sum + (item.pendingAckQueueSize ?? 0), 0);
    const ackQueueFlushFailedTotal = filteredItems.reduce((sum, item) => sum + (item.ackQueueFlushFailed ?? 0), 0);
    const hostsWithContractError = filteredItems.filter((item) => !!item.contractErrorCode);
    const contractErrorTop = hostsWithContractError.reduce<Record<string, number>>((acc, item) => {
      const key = item.contractErrorCode ?? "UNKNOWN";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const contractErrorTopEntry = Object.entries(contractErrorTop).sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      bootstrapRateAvg,
      pendingAckQueueTotal,
      ackQueueFlushFailedTotal,
      contractErrorHosts: hostsWithContractError.length,
      contractErrorTopCode: contractErrorTopEntry?.[0] ?? null,
      contractErrorTopCount: contractErrorTopEntry?.[1] ?? 0,
    };
  }, [filteredItems]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Plataforma Remota
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestao centralizada de hosts e conectividade RustDesk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateHosts && (
            <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Host
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar host manualmente</DialogTitle>
                  <DialogDescription>
                    Cadastro assistido para criar um host operacional com empresa pesquisavel, identidade do RustDesk e contexto tecnico claro.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Empresa</Label>
                      <SearchableCompanyPicker
                        value={quickCompanyId}
                        options={directory.companyOptions}
                        searchUrl="/api/remote/companies/search"
                        onChange={setQuickCompanyId}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pesquise por razao social, nome fantasia ou codigo operacional para localizar a empresa com mais rapidez.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do host</Label>
                      <Input value={quickHostName} onChange={(event) => setQuickHostName(event.target.value)} placeholder="Ex.: SERVIDOR MATRIZ FISCAL" />
                    </div>

                    <div className="space-y-2">
                      <Label>Ambiente</Label>
                      <Input
                        list="quick-environment-options"
                        value={quickEnvironment}
                        onChange={(event) => setQuickEnvironment(event.target.value)}
                        placeholder="Producao"
                      />
                      <datalist id="quick-environment-options">
                        {QUICK_ENVIRONMENT_TEMPLATES.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <Label>RustDesk ID</Label>
                      <Input value={quickRustdeskId} onChange={(event) => setQuickRustdeskId(event.target.value)} placeholder="21187620068" />
                      <p className="text-xs text-muted-foreground">Informe apenas numeros. O portal valida IDs com 7 a 12 digitos.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Descricao operacional</Label>
                      <Input
                        list="quick-description-options"
                        value={quickDescription}
                        onChange={(event) => setQuickDescription(event.target.value)}
                        placeholder="ERP matriz / servidor fiscal"
                      />
                      <datalist id="quick-description-options">
                        {QUICK_DESCRIPTION_TEMPLATES.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview operacional</p>
                    <div className="mt-2 grid gap-2 text-sm text-foreground md:grid-cols-2">
                      <p><span className="text-muted-foreground">Empresa:</span> {directory.companyOptions.find((company) => company.id === quickCompanyId)?.label ?? "Nao selecionada"}</p>
                      <p><span className="text-muted-foreground">Host:</span> {quickHostName.trim() || "Nao informado"}</p>
                      <p><span className="text-muted-foreground">Ambiente:</span> {quickEnvironment.trim() || "Nao informado"}</p>
                      <p><span className="text-muted-foreground">RustDesk ID:</span> {quickRustdeskId.trim() || "Nao informado"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Para maquinas sem empresa definida no momento da instalacao, prefira o fluxo de descoberta automatica. Elas aparecem em <strong>Novas Descobertas</strong> e podem ser vinculadas depois.
                    </p>
                    <Button onClick={handleQuickCreateHost} disabled={isPending} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar host
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border/50 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              Saude da Frota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-foreground">{directoryStats.ready}</p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Online</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">ID e heartbeat 100% operacionais</p>
          </CardContent>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ShieldCheck className="h-12 w-12" />
          </div>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              Atenção técnica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-foreground">{directoryStats.attention}</p>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Instaveis</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Hosts com contato intermitente</p>
          </CardContent>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TimerReset className="h-12 w-12" />
          </div>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-sky-500" />
              Fluxo de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-foreground">{directoryStats.openSessions}</p>
              <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Ativos</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Sessoes em uso ou solicitadas</p>
          </CardContent>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Monitor className="h-12 w-12" />
          </div>
        </Card>

        {canCreateHosts ? (
          <Card className="relative overflow-hidden border-amber-500/20 bg-amber-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5" />
                Novas Descobertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight text-amber-800 dark:text-amber-100">{directory.stats.pendingDiscovery}</p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Pendentes</p>
              </div>
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400/80">Aguardando vinculacao inicial</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Plus className="h-12 w-12" />
            </div>
          </Card>
        ) : (
          <Card className="relative overflow-hidden border-border/50 bg-background/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-rose-500" />
                Configuração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight text-foreground">{directoryStats.pendingSetup}</p>
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Setup</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Hosts sem bootstrap completo</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Wrench className="h-12 w-12" />
            </div>
          </Card>
        )}
      </div>

      <details className="rounded-xl border border-border/50 bg-muted/10 p-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Observabilidade operacional (colapsado por padrao)
        </summary>
        <div className="mt-4 space-y-4">
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">% bootstrap/ciclo 24h</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {operationalObservability.bootstrapRateAvg === null ? "Sem leitura" : `${operationalObservability.bootstrapRateAvg}%`}
              </p>
              <p className="text-[11px] text-muted-foreground">Media entre hosts filtrados com telemetria</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">pendingAckQueue</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{operationalObservability.pendingAckQueueTotal}</p>
              <p className="text-[11px] text-muted-foreground">Total em fila local pendente de flush</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ackQueueFlush.failed</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{operationalObservability.ackQueueFlushFailedTotal}</p>
              <p className="text-[11px] text-muted-foreground">Falhas de flush observadas no ultimo ciclo</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">lastContractErrorCode</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {operationalObservability.contractErrorTopCode ?? "Sem erro"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {operationalObservability.contractErrorHosts} host(s) com degradacao
                {operationalObservability.contractErrorTopCode ? ` | ${operationalObservability.contractErrorTopCount} ocorrencias` : ""}
              </p>
            </div>
          </div>
        </div>
      </details>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Pesquisar por empresa, host, IP, RustDesk ID ou ticket..."
                  className="h-10 pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setShowFilters(!showFilters)}
                title="Filtros avançados"
              >
                <Filter className="h-4 w-4" />
              </Button>
              {(searchTerm || statusFilter !== "all" || environmentFilter !== "all" || heartbeatFilter !== "all" || agentFilter !== "all" || operationalFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setEnvironmentFilter("all");
                    setHeartbeatFilter("all");
                    setAgentFilter("all");
                    setOperationalFilter("all");
                  }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>

            {showFilters && (
              <Card className="border-border/40 bg-muted/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="MAINTENANCE">Manutencao</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ambiente</Label>
                    <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Ambiente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {environmentOptions.map((env) => (
                          <SelectItem key={env} value={env}>{env}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Conectividade</Label>
                    <Select value={heartbeatFilter} onValueChange={(value) => setHeartbeatFilter(value as typeof heartbeatFilter)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Conectividade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="recent">Online agora</SelectItem>
                        <SelectItem value="stale">Instavel</SelectItem>
                        <SelectItem value="missing">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Agente</Label>
                    <Select value={agentFilter} onValueChange={(value) => setAgentFilter(value as typeof agentFilter)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Agente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="awaiting_link">Aguardando vinculo</SelectItem>
                        <SelectItem value="provisioning">Provisionando</SelectItem>
                        <SelectItem value="ready">Remoto pronto</SelectItem>
                        <SelectItem value="attention">Atencao</SelectItem>
                        <SelectItem value="in_service">Em atendimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Operação</Label>
                    <Select value={operationalFilter} onValueChange={(value) => setOperationalFilter(value as typeof operationalFilter)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Operacao" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="provisioning">Provisionando</SelectItem>
                        <SelectItem value="ready">Remoto pronto</SelectItem>
                        <SelectItem value="attention_required">Atencao</SelectItem>
                        <SelectItem value="in_service">Em atendimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-6 border-border/50 bg-background/50 font-medium">
                {activeResultCount} hosts
              </Badge>
              {filteredQuickIndicators.online > 0 && (
                <Badge variant="outline" className="h-6 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Zap className="mr-1 h-3 w-3 fill-current" />
                  {filteredQuickIndicators.online} online
                </Badge>
              )}
              {filteredQuickIndicators.rebootPending > 0 && (
                <Badge variant="outline" className="h-6 border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400">
                  <Activity className="mr-1 h-3 w-3" />
                  {filteredQuickIndicators.rebootPending} reboot
                </Badge>
              )}
              {canCreateHosts && activePendingCount > 0 && (
                <Badge variant="outline" className="h-6 border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {activePendingCount} em triagem
                </Badge>
              )}
            </div>
          </div>


          {canCreateHosts && filteredPendingItems.length ? (
            <details className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4" open={false}>
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Maquinas pendentes de vinculacao</summary>
              <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-foreground">Triagem inicial do agente</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estas maquinas ja foram descobertas pelo agente, mas ainda nao receberam vinculo empresarial.
                  Enquanto permanecerem aqui, o agente nao instala nem configura o RustDesk. O fluxo correto e: descoberta, vinculo, bootstrap, instalacao/configuracao do remoto.
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
                        
                        {/* Live Telemetry Badges for Triage */}
                        {item.lastAgentMetrics?.cpuLoad !== undefined && (
                          <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                            CPU: {item.lastAgentMetrics.cpuLoad}%
                          </Badge>
                        )}
                        {item.lastAgentMetrics?.ramUsedPc !== undefined && (
                          <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                            RAM: {item.lastAgentMetrics.ramUsedPc}%
                          </Badge>
                        )}
                        {item.lastAgentMetrics?.diskFree != null && (
                          <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                            DISK: {(item.lastAgentMetrics.diskFree / (1024 * 1024 * 1024)).toFixed(1)}GB
                          </Badge>
                        )}
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
                      <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        Proximo passo: vincular a maquina a uma empresa/host. So depois disso o agente recebe bootstrap e habilita o remoto.
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(360px,1.35fr)_minmax(280px,1fr)_auto] xl:items-end">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Empresa</Label>
                        <SearchableCompanyPicker
                          value={pendingCompanyById[item.id] ?? directory.companyOptions[0]?.id ?? ""}
                          options={directory.companyOptions}
                          searchUrl="/api/remote/companies/search"
                          onChange={(value) =>
                            setPendingCompanyById((current) => ({ ...current, [item.id]: value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome do host</Label>
                        <Input
                          className="min-w-[280px]"
                          value={pendingNameById[item.id] ?? item.machineName ?? ""}
                          onChange={(event) =>
                            setPendingNameById((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          placeholder="Ex.: Servidor matriz fiscal"
                        />
                      </div>
                      <Button className="xl:min-w-[120px]" type="button" onClick={() => handleLinkDiscoveredHost(item.id, item.machineName)}>
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
                const productStatus = getRemoteProductStatusMeta(item.productStatus);
                const rustdeskHref = item.rustdeskId ? `rustdesk://${item.rustdeskId.replace(/\s+/g, "")}` : null;
                const installationNames = item.installationCompanies.length
                  ? item.installationCompanies
                  : item.companyName
                  ? [item.companyName]
                  : [];

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-border/40 bg-background/50 p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/5 hover:shadow-md"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-center">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${heartbeat.bucket === "recent" ? "animate-pulse border-emerald-500 bg-emerald-500" : "border-muted-foreground/30 bg-muted-foreground/20"}`} />
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="h-5 text-[10px] font-bold uppercase tracking-wider bg-background/80">
                              {getStatusLabel(item.status)}
                            </Badge>
                            {item.environment && (
                              <Badge variant="outline" className="h-5 text-[10px] border-border/40 bg-background/40">
                                {item.environment}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`h-5 text-[10px] ${productStatus.className}`}>
                              {productStatus.label}
                            </Badge>
                            
                            {/* Live Telemetry Badges */}
                            {item.lastAgentMetrics?.cpuLoad !== undefined && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/30 bg-background/30 text-[10px] font-mono text-muted-foreground">
                                <Cpu className="h-2.5 w-2.5" />
                                {item.lastAgentMetrics.cpuLoad}%
                              </div>
                            )}
                            {item.lastAgentMetrics?.ramUsedPc !== undefined && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/30 bg-background/30 text-[10px] font-mono text-muted-foreground">
                                <Activity className="h-2.5 w-2.5" />
                                {item.lastAgentMetrics.ramUsedPc}%
                              </div>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <p className="truncate text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {installationNames.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {installationNames[0]} {installationNames.length > 1 && `+${installationNames.length - 1}`}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.lastHeartbeatAt ? new Date(item.lastHeartbeatAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Offline"}
                              </span>
                              {item.lastTicketNumber && (
                                <span className="flex items-center gap-1 text-primary/80 font-medium">
                                  <Ticket className="h-3 w-3" />
                                  #{item.lastTicketNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:px-4">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">ID RustDesk</p>
                        <div className="relative group/id">
                          <code className="block w-full rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-sm font-mono tracking-tight text-foreground/80 transition-all group-hover/id:border-primary/20 group-hover/id:bg-muted/30">
                            {item.rustdeskId ?? "---"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/id:opacity-100 transition-opacity"
                            onClick={() => handleCopyRustDeskId(item.rustdeskId)}
                            disabled={!item.rustdeskId}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                        {rustdeskHref ? (
                          <Button asChild size="sm" className="h-9 font-semibold shadow-sm">
                            <a href={rustdeskHref}>
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              {isMobileClient ? "Abrir App" : "Acesso Rápido"}
                            </a>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="h-9 border-dashed">
                            Sem Conexão
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 bg-background/50 hover:bg-muted/50">
                          <Link href={`/portal/plataforma-remota/${item.id}`}>
                            Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Signals Bar */}
                    {(item.inventorySignals.rebootPending || item.inventorySignals.diskLow || item.inventorySignals.sysproProcessDown || item.contractErrorCode) && (
                      <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-border/20">
                        {item.inventorySignals.rebootPending && (
                          <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px]">
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin-slow" />
                            Reboot Pendente
                          </Badge>
                        )}
                        {item.inventorySignals.diskLow && (
                          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                            Disco Insuficiente
                          </Badge>
                        )}
                        {item.contractErrorCode && (
                          <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px]">
                            Erro de Contrato: {item.contractErrorCode}
                          </Badge>
                        )}
                      </div>
                    )}
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
