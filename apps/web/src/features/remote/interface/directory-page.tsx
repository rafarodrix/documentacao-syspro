"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  Plus,
  Search,
  ShieldCheck,
  X,
  Filter,
  Building2,
  Ticket,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeSearchText } from "@dosc-syspro/shared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
type PendingDirectoryItem = RemotePlatformDirectory["pendingItems"][number];
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
    shortLabel: "Instável",
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
  // Configured hosts are managed portal entities and should read technical fields from `item.agent.*`.
  // Pending items are pre-host discoveries and still intentionally use a flattened technical shape.
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
  const [scopeFilter, setScopeFilter] = useState<"all" | "online" | "offline" | "discovered">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickHostName, setQuickHostName] = useState("");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickEnvironment, setQuickEnvironment] = useState("Produção");
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
            environment: quickEnvironment.trim() || "Produção",
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
      setQuickEnvironment("Produção");
      setQuickDescription("");
      setShowQuickCreate(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setIsCreatingQuickHost(false);
    }
  }

  async function handleLinkDiscoveredHost(id: PendingDirectoryItem["id"], fallbackName: PendingDirectoryItem["machineName"]) {
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
    const normalizedRustdeskId = item.agent.rustdeskId?.replace(/\s+/g, "").trim() ?? "";
    if (!normalizedRustdeskId) {
      toast.error("Host sem identificador remoto. Não é possível iniciar sessão.");
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
            ? `Acesso técnico via ${isChatwootContext ? "Chatwoot" : "Portal"} para ${selectedCompanyLabel}`
            : `Acesso técnico via ${isChatwootContext ? "Chatwoot" : "Portal"}`,
      });

      if (!result.success) {
        toast.error(result.error ?? "Falha ao iniciar sessão auditada.");
        return;
      }

      toast.success("Sessao auditada iniciada.");
      const href = isMobileClient ? `rustdesk://[${normalizedRustdeskId}]` : `rustdesk://${normalizedRustdeskId}`;
      window.location.href = href;
    } catch {
      toast.error("Erro ao processar início de sessão.");
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
        item.agent.rustdeskId,
        item.description,
        item.agent.machineName,
        item.agent.agentVersion,
        item.lastTicketNumber,
        item.lastSessionStatus,
        item.status,
        item.companyId,
      ]
        .filter(Boolean)
        .join(" "));

      const heartbeat = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow);
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

  const filteredQuickIndicators = useMemo(() => {
    const referenceNow = hasHydrated ? Date.now() : null;
    const online = filteredItems.filter((item) => getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket === "recent").length;
    const stale = filteredItems.filter((item) => getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket === "stale").length;
    const offline = filteredItems.filter((item) => getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket === "missing").length;
    const rebootPending = filteredItems.filter((item) => item.inventorySignals.rebootPending === true).length;
    return { online, stale, offline, rebootPending };
  }, [filteredItems, hasHydrated]);
  const displayedItems = useMemo(() => {
    const referenceNow = hasHydrated ? Date.now() : null;

    if (scopeFilter === "online") {
      return filteredItems.filter((item) => getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket === "recent");
    }

    if (scopeFilter === "offline") {
      return filteredItems.filter((item) => {
        const bucket = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket;
        return bucket === "stale" || bucket === "missing";
      });
    }

    if (scopeFilter === "discovered") {
      return [];
    }

    return filteredItems;
  }, [filteredItems, hasHydrated, scopeFilter]);
  const visibleHostCount = scopeFilter === "discovered" ? filteredPendingItems.length : displayedItems.length;
  const shouldShowPendingItems =
    canCreateHosts && filteredPendingItems.length > 0 && (scopeFilter === "all" || scopeFilter === "discovered");
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por empresa, host, IP, ID remoto ou ticket..."
                className="h-10 rounded-md border-border/60 bg-background pl-10 text-sm transition-all focus:border-primary/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setShowFilters((current) => !current)}
                title="Filtros avancados"
              >
                <Filter className="h-4 w-4" />
              </Button>

              {(searchTerm ||
                scopeFilter !== "all" ||
                companyFilter !== "all" ||
                statusFilter !== "all" ||
                environmentFilter !== "all" ||
                heartbeatFilter !== "all" ||
                agentFilter !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchTerm("");
                    setScopeFilter("all");
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

              {canCreateHosts && (
                <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
                  <DialogTrigger asChild>
                    <Button type="button" className="h-10 gap-2 shrink-0">
                      <Plus className="h-4 w-4" />
                      Novo host
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar host manualmente</DialogTitle>
                      <DialogDescription>
                        Cadastro rápido para consolidar um host, definir a empresa e publicar o contexto que o agente vai consumir.
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
                            Pesquise por razao social, nome fantasia ou codigo operacional.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Nome do host</Label>
                          <Input
                            value={quickHostName}
                            onChange={(event) => setQuickHostName(event.target.value)}
                            placeholder="Ex.: SERVIDOR MATRIZ FISCAL"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Ambiente</Label>
                          <Input
                            list="quick-environment-options"
                            value={quickEnvironment}
                            onChange={(event) => setQuickEnvironment(event.target.value)}
                            placeholder="Produção"
                          />
                          <datalist id="quick-environment-options">
                            {QUICK_ENVIRONMENT_TEMPLATES.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        </div>

                        <div className="space-y-2">
                          <Label>RustDesk ID</Label>
                          <Input
                            value={quickRustdeskId}
                            onChange={(event) => setQuickRustdeskId(event.target.value)}
                            placeholder="21187620068"
                          />
                          <p className="text-xs text-muted-foreground">
                            Informe apenas números. O portal valida IDs com 7 a 12 dígitos.
                          </p>
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

                      <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Preview operacional
                        </p>
                        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                          <p>
                            <span className="text-muted-foreground">Empresa:</span>{" "}
                            {directory.companyOptions.find((company) => company.id === quickCompanyId)?.label ?? "Nao selecionada"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Host:</span> {quickHostName.trim() || "Nao informado"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Ambiente:</span> {quickEnvironment.trim() || "Nao informado"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">ID remoto:</span> {quickRustdeskId.trim() || "Nao informado"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          Para máquinas sem empresa definida no momento da instalação, prefira o fluxo de descoberta automática e vincule depois.
                        </p>
                        <Button
                          type="button"
                          onClick={handleQuickCreateHost}
                          disabled={isPending || isCreatingQuickHost}
                          className="gap-2"
                        >
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

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "Todas", count: filteredItems.length },
              { value: "online", label: "Online", count: filteredQuickIndicators.online },
              {
                value: "offline",
                label: "Offline",
                count: filteredQuickIndicators.stale + filteredQuickIndicators.offline,
              },
              { value: "discovered", label: "Descobertas", count: filteredPendingItems.length, hidden: !canCreateHosts },
            ]
              .filter((option) => !option.hidden)
              .map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={scopeFilter === option.value ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={() => setScopeFilter(option.value as typeof scopeFilter)}
                >
                  {option.label}
                  <span className="ml-2 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold">
                    {option.count}
                  </span>
                </Button>
              ))}
          </div>

          {showFilters && (
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Empresa</Label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-9 bg-background">
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
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                    <SelectTrigger className="h-9 bg-background">
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
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ambiente</Label>
                  <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {environmentOptions.map((env) => (
                        <SelectItem key={env} value={env}>
                          {env}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Conectividade</Label>
                  <Select value={heartbeatFilter} onValueChange={(value) => setHeartbeatFilter(value as typeof heartbeatFilter)}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Conectividade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="recent">Online agora</SelectItem>
                      <SelectItem value="stale">Instável</SelectItem>
                      <SelectItem value="missing">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Estado</Label>
                  <Select value={agentFilter} onValueChange={(value) => setAgentFilter(value as typeof agentFilter)}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="awaiting_link">Aguardando vínculo</SelectItem>
                      <SelectItem value="provisioning">Provisionando</SelectItem>
                      <SelectItem value="ready">Remoto pronto</SelectItem>
                      <SelectItem value="attention">Atencao tecnica</SelectItem>
                      <SelectItem value="in_service">Em atendimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-6 border-border/50 bg-background/50 font-medium">
              {visibleHostCount} {scopeFilter === "discovered" ? "descobertas" : "hosts"}
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
            {scopeFilter !== "discovered" && filteredQuickIndicators.rebootPending > 0 ? (
              <Badge variant="outline" className="h-6 border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400">
                {filteredQuickIndicators.rebootPending} reboot pendente
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {shouldShowPendingItems ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setShowPendingItems((prev) => !prev)}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Máquinas aguardando vínculo</p>
              <p className="text-xs text-muted-foreground">
                Descobertas pelo agente, mas ainda sem contexto empresarial no portal.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {filteredPendingItems.length}
            </Badge>
          </button>

          {showPendingItems || scopeFilter === "discovered" ? (
            <div className="space-y-2 border-t border-amber-500/20 px-4 py-4">
              {filteredPendingItems.map((item) => {
                const selectedCompanyId = pendingCompanyById[item.id] ?? directory.companyOptions[0]?.id ?? "";
                const proposedHostName = (pendingNameById[item.id] ?? item.machineName ?? "").trim();
                const canLinkPendingHost = Boolean(selectedCompanyId && proposedHostName);

                return (
                  <div key={item.id} className="rounded-xl border border-amber-500/20 bg-background/80 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,1fr)]">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            Pendente
                          </Badge>
                          {item.environment ? (
                            <Badge variant="outline" className="border-border/50 bg-background/70 text-muted-foreground">
                              {item.environment}
                            </Badge>
                          ) : null}
                          {item.lastAgentMetrics?.cpuLoad !== undefined ? (
                            <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                              CPU {item.lastAgentMetrics.cpuLoad}%
                            </Badge>
                          ) : null}
                          {item.lastAgentMetrics?.ramUsedPc !== undefined ? (
                            <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                              RAM {item.lastAgentMetrics.ramUsedPc}%
                            </Badge>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {item.machineName ?? "Máquina sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID remoto {item.rustdeskId ?? "não informado"}
                            {item.agentVersion ? ` | agente ${item.agentVersion}` : ""}
                            {item.lastHeartbeatAt ? ` | heartbeat ${formatHeartbeatDateTime(item.lastHeartbeatAt, hasHydrated)}` : ""}
                          </p>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {item.installationCompanies.length
                            ? `Instalacoes detectadas: ${item.installationCompanies.join(" | ")}`
                            : "Nenhuma instalacao detectada no ultimo heartbeat."}
                        </p>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)_auto] xl:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Empresa</Label>
                          <SearchableCompanyPicker
                            value={selectedCompanyId}
                            options={directory.companyOptions}
                            searchUrl="/api/remote/companies/search"
                            onChange={(value) =>
                              setPendingCompanyById((current) => ({ ...current, [item.id]: value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nome do host</Label>
                          <Input
                            value={pendingNameById[item.id] ?? item.machineName ?? ""}
                            onChange={(event) =>
                              setPendingNameById((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            placeholder="Ex.: Servidor matriz fiscal"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleLinkDiscoveredHost(item.id, item.machineName)}
                          disabled={!canLinkPendingHost}
                          className="xl:min-w-28"
                        >
                          Vincular
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {displayedItems.length ? (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/70 shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.9fr)_160px_180px_260px] items-center gap-4 border-b border-border/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Host</span>
            <span>Heartbeat</span>
            <span>ID remoto</span>
            <span className="text-right">Ações</span>
          </div>

          <div className="divide-y divide-border/30">
            {displayedItems.map((item) => {
              const heartbeat = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, hasHydrated ? Date.now() : null);
              const productStatus = getRemoteProductStatusMeta(item.productStatus);
              const installationNames = item.installationCompanies.length
                ? item.installationCompanies
                : item.companyName
                  ? [item.companyName]
                  : [];

              return (
                <div key={item.id} className="px-4 py-4 transition-colors hover:bg-muted/10">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_160px_180px_260px] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            heartbeat.bucket === "recent"
                              ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                              : heartbeat.bucket === "stale"
                                ? "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]"
                                : "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]"
                          }`}
                        />

                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="h-5 bg-background/90 text-[10px] font-bold uppercase tracking-wider">
                              {getStatusLabel(item.status)}
                            </Badge>
                            {item.environment ? (
                              <Badge variant="outline" className="h-5 border-border/40 bg-background/40 text-[10px]">
                                {item.environment}
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className={`h-5 text-[10px] ${productStatus.className}`}>
                              {productStatus.label}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {installationNames.length > 0 ? (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {installationNames[0]}
                                  {installationNames.length > 1 ? ` +${installationNames.length - 1}` : ""}
                                </span>
                              ) : null}
                              {item.lastTicketNumber ? (
                                <span className="flex items-center gap-1 text-primary/80">
                                  <Ticket className="h-3 w-3" />#{item.lastTicketNumber}
                                </span>
                              ) : null}
                              {item.agent.agentVersion ? <span>{item.agent.agentVersion}</span> : null}
                              {item.agent.lastKnownIp ? <span>{item.agent.lastKnownIp}</span> : null}
                            </div>
                          </div>

                          {(item.inventorySignals.rebootPending ||
                            item.inventorySignals.diskLow ||
                            item.inventorySignals.sysproProcessDown ||
                            item.contractErrorCode) ? (
                            <div className="flex flex-wrap gap-2">
                              {item.inventorySignals.rebootPending ? (
                                <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
                                  Reboot pendente
                                </Badge>
                              ) : null}
                              {item.inventorySignals.diskLow ? (
                                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
                                  Disco baixo
                                </Badge>
                              ) : null}
                              {item.contractErrorCode ? (
                                <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
                                  Contrato {item.contractErrorCode}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">Heartbeat</p>
                      <Badge variant="outline" className={heartbeat.className}>
                        {heartbeat.shortLabel}
                      </Badge>
                      <p className="text-xs text-muted-foreground" title={formatHeartbeatDateTime(item.agent.lastHeartbeatAt, hasHydrated)}>
                        {formatHeartbeatTime(item.agent.lastHeartbeatAt, hasHydrated)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">ID remoto</p>
                      <div className="flex items-center gap-2">
                        <code className="block w-full rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground/80">
                          {item.agent.rustdeskId ?? "---"}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleCopyRustDeskId(item.agent.rustdeskId)}
                          disabled={!item.agent.rustdeskId}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 min-w-24"
                        onClick={() => handleQuickConnect(item)}
                        disabled={!item.agent.rustdeskId || connectingHostId === item.id}
                      >
                        {connectingHostId === item.id ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                        )}
                        Conectar
                      </Button>

                      <Button asChild variant="outline" size="sm" className="h-9 min-w-24 bg-background/70">
                        <Link
                          href={`/portal/infraestrutura/hosts/${item.id}${initialTicketNumber ? `?ticketNumber=${encodeURIComponent(initialTicketNumber)}` : ""}`}
                        >
                          Ver detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !shouldShowPendingItems ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/50 p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-foreground">Nenhum item encontrado</p>
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? `Nenhum host corresponde a "${searchTerm}".`
              : "Nenhum host remoto configurado no seu escopo."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
