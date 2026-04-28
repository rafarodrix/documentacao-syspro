"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Plus,
  Search,
  ShieldCheck,
  TimerReset,
  Wrench,
  X,
  Activity,
  Zap,
  Filter,
  Cpu,
  Building2,
  Clock,
  Ticket,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeSearchText } from "@dosc-syspro/shared";
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
import type { RemotePlatformDirectory } from "@/features/remote/domain/model";
import { getRemoteProductStatusMeta } from "@/features/remote/domain";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import {
  RemoteApiClientError,
  getRemoteApiErrorMessage,
  requestRemoteMutation,
} from "@/features/remote/interface/remote-api";
import { SearchableCompanyPicker } from "./host-details/components/SearchableCompanyPicker";

type DirectoryItem = RemotePlatformDirectory["items"][number];
type RemotePlatformDirectoryPanelProps = {
  directory: RemotePlatformDirectory;
  initialCompanyId?: string;
  initialTicketNumber?: string;
};

function normalizeSearchValue(value: string | null | undefined) {
  return normalizeSearchText(value, { preserveSeparators: false });
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
  "Estação do faturamento",
  "Servidor de aplicação",
  "PDV / caixa operacional",
];

const QUICK_ENVIRONMENT_TEMPLATES = [
  "Produção",
  "Homologação",
  "Servidor",
  "Matriz",
  "Filial",
  "Terminal",
];

function getStatusLabel(status: "ACTIVE" | "MAINTENANCE" | "INACTIVE") {
  if (status === "ACTIVE") return "Ativo";
  if (status === "MAINTENANCE") return "Manutenção";
  return "Inativo";
}

function getHeartbeatMeta(lastHeartbeatAt: string | null) {
  return getHeartbeatMetaAt(lastHeartbeatAt, null);
}

function getHeartbeatMetaAt(lastHeartbeatAt: string | null, referenceNow: number | null) {
  if (!lastHeartbeatAt) {
    return {
      label: "Sem heartbeat",
      shortLabel: "Offline",
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      bucket: "missing" as const,
    };
  }

  if (referenceNow == null) {
    return {
      label: "Heartbeat detectado",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      bucket: "recent" as const,
    };
  }

  const diffMinutes = Math.floor((referenceNow - new Date(lastHeartbeatAt).getTime()) / 60000);
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

function formatHeartbeatDateTime(value: string | null, hasHydrated: boolean) {
  if (!value) return "";
  if (!hasHydrated) return "Sincronizando horario...";
  return new Date(value).toLocaleString("pt-BR");
}

function formatHeartbeatTime(value: string | null, hasHydrated: boolean) {
  if (!value) return "Offline";
  if (!hasHydrated) return "--:--";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

export function RemotePlatformDirectoryPanel({
  directory,
  initialCompanyId,
  initialTicketNumber,
}: RemotePlatformDirectoryPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState(initialCompanyId ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "MAINTENANCE" | "INACTIVE">("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [heartbeatFilter, setHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
  const [agentFilter, setAgentFilter] = useState<"all" | "awaiting_link" | "provisioning" | "ready" | "attention" | "in_service">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickHostName, setQuickHostName] = useState("");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickEnvironment, setQuickEnvironment] = useState("Producao");
  const [quickDescription, setQuickDescription] = useState("");
  const [pendingCompanyById, setPendingCompanyById] = useState<Record<string, string>>({});
  const [pendingNameById, setPendingNameById] = useState<Record<string, string>>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isCreatingQuickHost, setIsCreatingQuickHost] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPendingItems, setShowPendingItems] = useState(false);
  const [connectingHostId, setConnectingHostId] = useState<string | null>(null);
  const canCreateHosts = directory.tenantScope.role !== "CLIENTE_ADMIN";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
    setHasHydrated(true);
  }, []);

  const environmentOptions = useMemo(() => {
    const values = Array.from(new Set(directory.items.map((item) => item.environment).filter(Boolean))) as string[];
    return values.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [directory.items]);
  const selectedCompanyLabel = useMemo(
    () => directory.companyOptions.find((company) => company.id === companyFilter)?.label ?? null,
    [companyFilter, directory.companyOptions],
  );

  async function handleCopyRustDeskId(value: string | null) {
    if (!value) {
      toast.error("ID remoto não configurado.");
      return;
    }

    try {
      await copyTextWithFallback(value);
      toast.success("ID remoto copiado.");
    } catch {
      toast.error("Falha ao copiar o ID remoto.");
    }
  }

  async function handleQuickCreateHost() {
    if (isCreatingQuickHost) return;

    if (!quickCompanyId || !quickHostName.trim() || !quickRustdeskId.trim() || !quickDescription.trim()) {
      toast.error("Selecione a empresa e informe nome do host, ID remoto e descrição.");
      return;
    }

    const rustdeskId = normalizeRustDeskId(quickRustdeskId);
    if (!rustdeskId.isValid || !rustdeskId.normalized) {
      toast.error("ID remoto inválido. Informe apenas números com 7 a 12 dígitos.");
      return;
    }

    try {
      setIsCreatingQuickHost(true);
      const controller = new AbortController();
      const timeoutHandle = window.setTimeout(() => controller.abort(), 15000);
      let result;
      try {
        result = await requestRemoteMutation<Record<string, unknown>>({
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
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutHandle);
      }

      toast.success(result.message ?? "Host criado com sucesso.");
      setQuickHostName("");
      setQuickRustdeskId("");
      setQuickEnvironment("Producao");
      setQuickDescription("");
      setShowQuickCreate(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setIsCreatingQuickHost(false);
    }
  }

  async function handleLinkDiscoveredHost(id: string, fallbackName: string | null) {
    const companyId = pendingCompanyById[id] ?? directory.companyOptions[0]?.id ?? "";
    const name = (pendingNameById[id] ?? fallbackName ?? "").trim();

    if (!companyId || !name) {
      toast.error("Selecione a empresa e informe o nome do host para vincular.");
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

      toast.success("Máquina vinculada e convertida em host.");
      startTransition(() => router.refresh());
    } catch (error) {
      if (
        error instanceof RemoteApiClientError &&
        (error.httpStatus === 429 || error.code === "RATE_LIMITED")
      ) {
        toast("Limite temporário. Nova tentativa automática em 5 segundos.");
        await delay(5000);
        try {
          await tryLink();
          toast.success("Máquina vinculada e convertida em host.");
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

  async function handleQuickConnect(item: DirectoryItem) {
    const normalizedRustdeskId = item.rustdeskId?.replace(/\s+/g, "").trim() ?? "";
    if (!normalizedRustdeskId) {
      toast.error("Host sem identificador remoto. Nao e possivel iniciar sessao.");
      return;
    }

    const isChatwootContext = Boolean(initialCompanyId || initialTicketNumber);
    setConnectingHostId(item.id);
    try {
      const result = await requestRemoteSessionAction({
        hostId: item.id,
        companyId: item.companyId,
        ticketNumber: initialTicketNumber ?? item.lastTicketNumber,
        reason: initialTicketNumber
          ? `Suporte via ${isChatwootContext ? "Chatwoot" : "Portal"} para Ticket #${initialTicketNumber}`
          : selectedCompanyLabel
            ? `Acesso tecnico via ${isChatwootContext ? "Chatwoot" : "Portal"} para ${selectedCompanyLabel}`
            : `Acesso tecnico via ${isChatwootContext ? "Chatwoot" : "Portal"}`,
      });

      if (!result.success) {
        toast.error(result.error ?? "Falha ao iniciar sessao auditada.");
        return;
      }

      toast.success("Sessao auditada iniciada.");
      const href = isMobileClient ? `rustdesk://[${normalizedRustdeskId}]` : `rustdesk://${normalizedRustdeskId}`;
      window.location.href = href;
    } catch {
      toast.error("Erro ao processar inicio de sessao.");
    } finally {
      setConnectingHostId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    const referenceNow = hasHydrated ? Date.now() : null;
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

      const heartbeat = getHeartbeatMetaAt(item.lastHeartbeatAt, referenceNow);
      const matchesSearch = !term || haystack.includes(term);
      const matchesCompany = companyFilter === "all" || item.companyId === companyFilter;
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

      return matchesSearch && matchesCompany && matchesStatus && matchesEnvironment && matchesHeartbeat && matchesAgent;
    });
  }, [agentFilter, companyFilter, directory.items, environmentFilter, hasHydrated, heartbeatFilter, searchTerm, statusFilter]);

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
        const normalizedSelectedCompany = normalizeSearchValue(selectedCompanyLabel);
        const matchesCompany =
          companyFilter === "all" ||
          (normalizedSelectedCompany.length > 0 &&
            item.installationCompanies.some((company) =>
              normalizeSearchValue(company).includes(normalizedSelectedCompany),
            ));

        return (!term || haystack.includes(term)) && matchesCompany;
      })
      .sort((a, b) => {
        const aHeartbeat = a.lastHeartbeatAt ? Date.parse(a.lastHeartbeatAt) : 0;
        const bHeartbeat = b.lastHeartbeatAt ? Date.parse(b.lastHeartbeatAt) : 0;
        if (aHeartbeat !== bHeartbeat) {
          return bHeartbeat - aHeartbeat;
        }
        return (a.machineName ?? "").localeCompare(b.machineName ?? "", "pt-BR");
      });
  }, [companyFilter, directory.pendingItems, searchTerm, selectedCompanyLabel]);

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
    const referenceNow = hasHydrated ? Date.now() : null;
    const online = filteredItems.filter((item) => getHeartbeatMetaAt(item.lastHeartbeatAt, referenceNow).bucket === "recent").length;
    const stale = filteredItems.filter((item) => getHeartbeatMetaAt(item.lastHeartbeatAt, referenceNow).bucket === "stale").length;
    const offline = filteredItems.filter((item) => getHeartbeatMetaAt(item.lastHeartbeatAt, referenceNow).bucket === "missing").length;
    const rebootPending = filteredItems.filter((item) => item.inventorySignals.rebootPending === true).length;
    return { online, stale, offline, rebootPending };
  }, [filteredItems, hasHydrated]);
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Hosts remotos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão centralizada de hosts e conectividade remota.
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
                    Cadastro assistido para criar um host operacional com empresa pesquisável, identidade do acesso remoto e contexto técnico claro.
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
                        Pesquise por razão social, nome fantasia ou código operacional para localizar a empresa.
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
                      <p className="text-xs text-muted-foreground">Informe apenas números. O portal valida IDs com 7 a 12 dígitos.</p>
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
                      <p><span className="text-muted-foreground">Empresa:</span> {directory.companyOptions.find((company) => company.id === quickCompanyId)?.label ?? "Não selecionada"}</p>
                      <p><span className="text-muted-foreground">Host:</span> {quickHostName.trim() || "Não informado"}</p>
                      <p><span className="text-muted-foreground">Ambiente:</span> {quickEnvironment.trim() || "Não informado"}</p>
                      <p><span className="text-muted-foreground">ID remoto:</span> {quickRustdeskId.trim() || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Para máquinas sem empresa definida no momento da instalação, prefira o fluxo de descoberta automática. Elas aparecem em <strong>Máquinas aguardando vínculo</strong> e podem ser vinculadas depois.
                    </p>
                    <Button type="button" onClick={handleQuickCreateHost} disabled={isPending || isCreatingQuickHost} className="gap-2">
                      {isCreatingQuickHost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {isCreatingQuickHost ? "Criando..." : "Criar host"}
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
            <p className="mt-1 text-[11px] text-muted-foreground">Conexão e heartbeat operacionais</p>
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
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400/80">Aguardando vínculo inicial</p>
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
              <p className="mt-1 text-[11px] text-muted-foreground">Hosts sem configuração completa</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Wrench className="h-12 w-12" />
            </div>
          </Card>
        )}
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Pesquisar por empresa, host, IP, ID remoto ou ticket..."
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
              {(searchTerm ||
                companyFilter !== "all" ||
                statusFilter !== "all" ||
                environmentFilter !== "all" ||
                heartbeatFilter !== "all" ||
                agentFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchTerm("");
                    setCompanyFilter("all");
                    setStatusFilter("all");
                    setEnvironmentFilter("all");
                    setHeartbeatFilter("all");
                    setAgentFilter("all");
                  }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>

            {showFilters && (
              <Card className="border-border/40 bg-muted/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Empresa</Label>
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {directory.companyOptions.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="MAINTENANCE">Manutenção</SelectItem>
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
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estado</Label>
                    <Select value={agentFilter} onValueChange={(value) => setAgentFilter(value as typeof agentFilter)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="awaiting_link">Aguardando vínculo</SelectItem>
                        <SelectItem value="provisioning">Provisionando</SelectItem>
                        <SelectItem value="ready">Remoto pronto</SelectItem>
                        <SelectItem value="attention">Atenção técnica</SelectItem>
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
              {selectedCompanyLabel ? (
                <Badge variant="outline" className="h-6 border-primary/20 bg-primary/10 text-primary">
                  <Building2 className="mr-1 h-3 w-3" />
                  {selectedCompanyLabel}
                </Badge>
              ) : null}
              {initialTicketNumber ? (
                <Badge variant="outline" className="h-6 border-primary/20 bg-primary/10 text-primary">
                  <Ticket className="mr-1 h-3 w-3" />
                  Ticket #{initialTicketNumber}
                </Badge>
              ) : null}
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
                  {activePendingCount} aguardando vínculo
                </Badge>
              )}
            </div>
          </div>


          {canCreateHosts && filteredPendingItems.length ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setShowPendingItems((prev) => !prev)}
              >
                <span className="text-sm font-semibold text-foreground">
                  Máquinas aguardando vínculo
                  <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {filteredPendingItems.length}
                  </span>
                </span>
                <X className={`h-4 w-4 text-muted-foreground transition-transform ${showPendingItems ? "" : "rotate-45"}`} />
              </button>
              {showPendingItems && (
              <div className="space-y-3 px-4 pb-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-foreground">Triagem inicial</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estas máquinas já foram descobertas pelo agente, mas ainda não receberam vínculo empresarial.
                  Enquanto permanecerem aqui, o agente não instala nem configura o acesso remoto. O fluxo correto é: descoberta → vínculo → bootstrap → instalação do remoto.
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
                          ID remoto: {item.rustdeskId ?? "Não informado"}
                          {item.agentVersion ? ` | Agente: ${item.agentVersion}` : ""}
                          {item.lastHeartbeatAt ? ` | Heartbeat: ${formatHeartbeatDateTime(item.lastHeartbeatAt, hasHydrated)}` : ""}
                        </p>
                      </div>
                      {item.installationCompanies.length ? (
                        <p className="text-sm text-muted-foreground">
                          Instalações detectadas: {item.installationCompanies.join(" | ")}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma instalação detectada ainda no heartbeat.</p>
                      )}
                      <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        Próximo passo: vincular a máquina a uma empresa. Só depois disso o agente recebe bootstrap e habilita o remoto.
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
              )}
            </div>
          ) : null}

          {filteredItems.length ? (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const heartbeat = getHeartbeatMetaAt(item.lastHeartbeatAt, hasHydrated ? Date.now() : null);
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
                                {formatHeartbeatTime(item.lastHeartbeatAt, hasHydrated)}
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
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">ID Remoto</p>
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
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 font-semibold shadow-sm"
                          onClick={() => handleQuickConnect(item)}
                          disabled={!item.rustdeskId || connectingHostId === item.id}
                        >
                          {connectingHostId === item.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                          )}
                          Conectar
                        </Button>
                        {rustdeskHref ? (
                          <Button asChild variant="outline" size="sm" className="h-9 font-semibold shadow-sm">
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
                          <Link
                            href={`/portal/infraestrutura/hosts/${item.id}${initialTicketNumber ? `?ticketNumber=${encodeURIComponent(initialTicketNumber)}` : ""}`}
                          >
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
                ? `Nenhum host corresponde a "${searchTerm}".`
                : "Nenhum host remoto configurado no seu escopo."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
