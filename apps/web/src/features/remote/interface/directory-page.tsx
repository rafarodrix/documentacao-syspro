"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  Plus,
  Search,
  ShieldCheck,
  X,
  Building2,
  Ticket,
  Loader2,
  Monitor,
  RotateCcw,
  HardDrive,
  AlertTriangle,
  Cpu,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeSearchText } from "@dosc-syspro/shared";
import { Badge, Input, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/patterns";
import type { RemotePlatformDirectory } from "@/features/remote/domain/remote-host.types";
import { getRemoteProductStatusMeta } from "@/features/remote/domain";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import {
  RemoteApiClientError,
  getRemoteApiErrorMessage,
  requestRemoteMutation,
} from "@/features/remote/interface/remote-api";
import { SearchableCompanyPicker } from "./host-details/components/searchable-company-picker";

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

function getHeartbeatMetaAt(lastHeartbeatAt: string | null, referenceNow: number | null) {
  if (!lastHeartbeatAt) {
    return {
      label: "Sem heartbeat",
      shortLabel: "Offline",
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      dotClass: "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]",
      bucket: "missing" as const,
    };
  }

  if (referenceNow == null) {
    return {
      label: "Heartbeat detectado",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dotClass: "animate-pulse bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
      bucket: "recent" as const,
    };
  }

  const diffMinutes = Math.floor((referenceNow - new Date(lastHeartbeatAt).getTime()) / 60000);
  if (diffMinutes <= 5) {
    return {
      label: "Heartbeat recente",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dotClass: "animate-pulse bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
      bucket: "recent" as const,
    };
  }

  return {
    label: "Heartbeat antigo",
    shortLabel: "Instável",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]",
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

function formatHeartbeatRelative(value: string | null, hasHydrated: boolean, referenceNow: number | null) {
  if (!value || !hasHydrated || referenceNow == null) return null;
  const diffMin = Math.floor((referenceNow - new Date(value).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
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
  const [heartbeatFilter, setHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
  const [agentFilter, setAgentFilter] = useState<"all" | "awaiting_link" | "provisioning" | "ready" | "attention" | "in_service">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "online" | "offline" | "discovered">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickHostName, setQuickHostName] = useState("");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [pendingCompanyById, setPendingCompanyById] = useState<Record<string, string>>({});
  const [pendingNameById, setPendingNameById] = useState<Record<string, string>>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isCreatingQuickHost, setIsCreatingQuickHost] = useState(false);
  const [showPendingItems, setShowPendingItems] = useState(false);
  const [connectingHostId, setConnectingHostId] = useState<string | null>(null);
  const canCreateHosts = directory.tenantScope.role !== "CLIENTE_ADMIN";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
    setHasHydrated(true);
  }, []);

  const selectedCompanyLabel = useMemo(
    () => directory.companyOptions.find((company) => company.id === companyFilter)?.label ?? null,
    [companyFilter, directory.companyOptions],
  );

  const hasActiveFilters = searchTerm || scopeFilter !== "all" || companyFilter !== "all" || heartbeatFilter !== "all" || agentFilter !== "all";

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
            environment: null,
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
        body: { companyId, name },
      });

    try {
      await tryLink();
      toast.success("Máquina vinculada e convertida em host.");
      startTransition(() => router.refresh());
    } catch (error) {
      if (error instanceof RemoteApiClientError && (error.httpStatus === 429 || error.code === "RATE_LIMITED")) {
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

    // Abre o protocolo imediatamente enquanto ainda está no contexto do gesto do usuário.
    // Qualquer await posterior quebraria esse contexto e browsers modernos bloqueiam
    // navegação para protocolos customizados fora de um gesto direto.
    const href = isMobileClient ? `rustdesk://[${normalizedRustdeskId}]` : `rustdesk://${normalizedRustdeskId}`;
    window.location.href = href;

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
        toast.error(result.error ?? "Falha ao registrar sessão auditada.");
      }
    } catch {
      // Protocolo já foi aberto; falha no registro da sessão é secundária
    } finally {
      setConnectingHostId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    const referenceNow = hasHydrated ? Date.now() : null;
    return directory.items.filter((item) => {
      const haystack = normalizeSearchValue(
        [item.name, item.companyName, item.installationCompanies.join(" "), item.provider, item.agent.rustdeskId, item.description, item.agent.machineName, item.agent.agentVersion, item.lastTicketNumber, item.lastSessionStatus, item.status, item.companyId]
          .filter(Boolean)
          .join(" "),
      );

      const heartbeat = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow);
      const matchesSearch = !term || haystack.includes(term);
      const matchesCompany = companyFilter === "all" || item.companyId === companyFilter;
      const matchesHeartbeat = heartbeatFilter === "all" || heartbeat.bucket === heartbeatFilter;
      const matchesAgent =
        agentFilter === "all" ||
        (agentFilter === "awaiting_link" && item.productStatus === "AWAITING_LINK") ||
        (agentFilter === "provisioning" && item.productStatus === "PROVISIONING_REMOTE") ||
        (agentFilter === "ready" && item.productStatus === "REMOTE_READY") ||
        (agentFilter === "attention" && item.productStatus === "ATTENTION_REQUIRED") ||
        (agentFilter === "in_service" && item.productStatus === "IN_SERVICE");

      return matchesSearch && matchesCompany && matchesHeartbeat && matchesAgent;
    });
  }, [agentFilter, companyFilter, directory.items, hasHydrated, heartbeatFilter, searchTerm]);

  const filteredPendingItems = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    return directory.pendingItems
      .filter((item) => {
        const haystack = normalizeSearchValue([item.machineName, item.rustdeskId, item.agentVersion, item.provider, item.description, item.installationCompanies.join(" ")].filter(Boolean).join(" "));
        const normalizedSelectedCompany = normalizeSearchValue(selectedCompanyLabel);
        const matchesCompany =
          companyFilter === "all" ||
          (normalizedSelectedCompany.length > 0 && item.installationCompanies.some((company) => normalizeSearchValue(company).includes(normalizedSelectedCompany)));
        return (!term || haystack.includes(term)) && matchesCompany;
      })
      .sort((a, b) => {
        const aHeartbeat = a.lastHeartbeatAt ? Date.parse(a.lastHeartbeatAt) : 0;
        const bHeartbeat = b.lastHeartbeatAt ? Date.parse(b.lastHeartbeatAt) : 0;
        if (aHeartbeat !== bHeartbeat) return bHeartbeat - aHeartbeat;
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
    if (scopeFilter === "online") return filteredItems.filter((item) => getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket === "recent");
    if (scopeFilter === "offline") return filteredItems.filter((item) => { const b = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket; return b === "stale" || b === "missing"; });
    if (scopeFilter === "discovered") return [];
    return filteredItems;
  }, [filteredItems, hasHydrated, scopeFilter]);

  const shouldShowPendingItems = canCreateHosts && filteredPendingItems.length > 0 && (scopeFilter === "all" || scopeFilter === "discovered");
  const referenceNow = hasHydrated ? Date.now() : null;

  return (
    <div className="space-y-3">
      {/* ── Top bar ── */}
      <div className="rounded-2xl border border-border/50 bg-card/70 p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por host, empresa, IP, ID remoto ou ticket..."
              className="h-9 rounded-lg border-border/60 bg-background pl-9 text-sm"
            />
          </div>

          {/* Inline filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-9 w-[170px] bg-background text-sm">
                <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {directory.companyOptions.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v as typeof agentFilter)}>
              <SelectTrigger className="h-9 w-[160px] bg-background text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer estado</SelectItem>
                <SelectItem value="ready">Remoto pronto</SelectItem>
                <SelectItem value="in_service">Em atendimento</SelectItem>
                <SelectItem value="provisioning">Provisionando</SelectItem>
                <SelectItem value="awaiting_link">Aguardando vínculo</SelectItem>
                <SelectItem value="attention">Atenção técnica</SelectItem>
              </SelectContent>
            </Select>

            <Select value={heartbeatFilter} onValueChange={(v) => setHeartbeatFilter(v as typeof heartbeatFilter)}>
              <SelectTrigger className="h-9 w-[140px] bg-background text-sm">
                <SelectValue placeholder="Conectividade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Conectividade</SelectItem>
                <SelectItem value="recent">Online agora</SelectItem>
                <SelectItem value="stale">Instável</SelectItem>
                <SelectItem value="missing">Offline</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchTerm(""); setScopeFilter("all"); setCompanyFilter("all"); setHeartbeatFilter("all"); setAgentFilter("all"); }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Limpar
              </Button>
            )}

            {canCreateHosts && (
              <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" className="h-9 gap-1.5 shrink-0">
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
                        <p className="text-xs text-muted-foreground">Pesquise por razao social, nome fantasia ou codigo operacional.</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome do host</Label>
                        <Input value={quickHostName} onChange={(e) => setQuickHostName(e.target.value)} placeholder="Ex.: SERVIDOR MATRIZ FISCAL" />
                      </div>

                      <div className="space-y-2">
                        <Label>RustDesk ID</Label>
                        <Input value={quickRustdeskId} onChange={(e) => setQuickRustdeskId(e.target.value)} placeholder="21187620068" />
                        <p className="text-xs text-muted-foreground">Informe apenas números. O portal valida IDs com 7 a 12 dígitos.</p>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Descricao operacional</Label>
                        <Input
                          list="quick-description-options"
                          value={quickDescription}
                          onChange={(e) => setQuickDescription(e.target.value)}
                          placeholder="ERP matriz / servidor fiscal"
                        />
                        <datalist id="quick-description-options">
                          {QUICK_DESCRIPTION_TEMPLATES.map((option) => <option key={option} value={option} />)}
                        </datalist>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview operacional</p>
                      <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                        <p><span className="text-muted-foreground">Empresa:</span> {directory.companyOptions.find((c) => c.id === quickCompanyId)?.label ?? "Nao selecionada"}</p>
                        <p><span className="text-muted-foreground">Host:</span> {quickHostName.trim() || "Nao informado"}</p>
                        <p><span className="text-muted-foreground">ID remoto:</span> {quickRustdeskId.trim() || "Nao informado"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">Para máquinas sem empresa definida, prefira o fluxo de descoberta automática e vincule depois.</p>
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

        {/* Scope pills + alert badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { value: "all", label: "Todos", count: filteredItems.length },
            { value: "online", label: "Online", count: filteredQuickIndicators.online },
            { value: "offline", label: "Offline", count: filteredQuickIndicators.stale + filteredQuickIndicators.offline },
            { value: "discovered", label: "Descobertas", count: filteredPendingItems.length, hidden: !canCreateHosts },
          ]
            .filter((o) => !o.hidden)
            .map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScopeFilter(option.value as typeof scopeFilter)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  scopeFilter === option.value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {option.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", scopeFilter === option.value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  {option.count}
                </span>
              </button>
            ))}

          {filteredQuickIndicators.rebootPending > 0 && scopeFilter !== "discovered" && (
            <Badge variant="outline" className="h-7 border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
              <RotateCcw className="mr-1 h-3 w-3" />
              {filteredQuickIndicators.rebootPending} reboot pendente
            </Badge>
          )}

          {selectedCompanyLabel && (
            <Badge variant="outline" className="h-7 border-primary/20 bg-primary/10 text-[10px] text-primary">
              <Building2 className="mr-1 h-3 w-3" />
              {selectedCompanyLabel}
            </Badge>
          )}
          {initialTicketNumber && (
            <Badge variant="outline" className="h-7 border-primary/20 bg-primary/10 text-[10px] text-primary">
              <Ticket className="mr-1 h-3 w-3" />
              Ticket #{initialTicketNumber}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Pending items ── */}
      {shouldShowPendingItems && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setShowPendingItems((prev) => !prev)}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Máquinas aguardando vínculo</p>
              <p className="text-xs text-muted-foreground">Descobertas pelo agente, mas ainda sem contexto empresarial no portal.</p>
            </div>
            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {filteredPendingItems.length}
            </Badge>
          </button>

          {(showPendingItems || scopeFilter === "discovered") && (
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
                          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">Pendente</Badge>
                          {item.lastAgentMetrics?.cpuLoad != null && (
                            <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                              CPU {item.lastAgentMetrics.cpuLoad}%
                            </Badge>
                          )}
                          {item.lastAgentMetrics?.ramUsedPc != null && (
                            <Badge variant="outline" className="border-border/40 bg-background/50 font-mono text-[10px]">
                              RAM {item.lastAgentMetrics.ramUsedPc}%
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">{item.machineName ?? "Máquina sem nome"}</p>
                          <p className="text-xs text-muted-foreground">
                            ID remoto {item.rustdeskId ?? "não informado"}
                            {item.agentVersion ? ` | agente ${item.agentVersion}` : ""}
                            {item.lastHeartbeatAt ? ` | heartbeat ${formatHeartbeatDateTime(item.lastHeartbeatAt, hasHydrated)}` : ""}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.installationCompanies.length ? `Instalacoes detectadas: ${item.installationCompanies.join(" | ")}` : "Nenhuma instalacao detectada no ultimo heartbeat."}
                        </p>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)_auto] xl:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Empresa</Label>
                          <SearchableCompanyPicker
                            value={selectedCompanyId}
                            options={directory.companyOptions}
                            searchUrl="/api/remote/companies/search"
                            onChange={(value) => setPendingCompanyById((curr) => ({ ...curr, [item.id]: value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nome do host</Label>
                          <Input
                            value={pendingNameById[item.id] ?? item.machineName ?? ""}
                            onChange={(e) => setPendingNameById((curr) => ({ ...curr, [item.id]: e.target.value }))}
                            placeholder="Ex.: Servidor matriz fiscal"
                          />
                        </div>
                        <Button type="button" onClick={() => handleLinkDiscoveredHost(item.id, item.machineName)} disabled={!canLinkPendingHost} className="xl:min-w-28">
                          Vincular
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Host table ── */}
      {displayedItems.length ? (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/70 shadow-sm">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[16px_minmax(0,2.2fr)_minmax(0,1.3fr)_136px_96px_80px_88px_188px] items-center gap-3 border-b border-border/40 bg-muted/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span />
            <span>Host</span>
            <span>Empresa / Instalações</span>
            <span>ID remoto</span>
            <span>Sinais</span>
            <span>Métricas</span>
            <span>Heartbeat</span>
            <span className="text-right">Ações</span>
          </div>

          <div className="divide-y divide-border/30">
            {displayedItems.map((item) => {
              const heartbeat = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow);
              const productStatus = getRemoteProductStatusMeta(item.productStatus);
              const installationNames = item.installationCompanies.length ? item.installationCompanies : item.companyName ? [item.companyName] : [];
              const hasSignals = item.inventorySignals.rebootPending || item.inventorySignals.diskLow || item.inventorySignals.sysproProcessDown || !!item.contractErrorCode;
              const hasCpu = item.lastAgentMetrics?.cpuLoad != null;
              const hasRam = item.lastAgentMetrics?.ramUsedPc != null;

              return (
                <div key={item.id} className="group px-4 py-2.5 transition-colors hover:bg-muted/10">
                  {/* Desktop: grid layout */}
                  <div className="hidden lg:grid grid-cols-[16px_minmax(0,2.2fr)_minmax(0,1.3fr)_136px_96px_80px_88px_188px] items-center gap-3">
                    {/* Status dot */}
                    <div className={cn("h-2 w-2 rounded-full shrink-0", heartbeat.dotClass)} />

                    {/* Host */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-5">
                        {item.agent.machineName && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{item.agent.machineName}</span>
                        )}
                        {item.agent.lastKnownIp && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">{item.agent.lastKnownIp}</span>
                        )}
                        <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px] font-medium", productStatus.className)}>
                          {productStatus.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Company / tags */}
                    <div className="min-w-0">
                      {installationNames.length > 0 ? (
                        <>
                          <p className="truncate text-sm text-foreground">{installationNames[0]}</p>
                          {installationNames.length > 1 && (
                            <p className="text-[10px] text-muted-foreground">+{installationNames.length - 1} empresa(s)</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground/50">—</p>
                      )}
                      {item.lastTicketNumber && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/80 mt-0.5">
                          <Ticket className="h-2.5 w-2.5" />#{item.lastTicketNumber}
                        </span>
                      )}
                    </div>

                    {/* ID remoto */}
                    <div className="flex items-center gap-1">
                      <code className="min-w-0 truncate rounded-md border border-border/30 bg-muted/20 px-2 py-1 text-xs font-mono text-foreground/80">
                        {item.agent.rustdeskId ?? "---"}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyRustDeskId(item.agent.rustdeskId)}
                        disabled={!item.agent.rustdeskId}
                        title="Copiar ID"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Sinais */}
                    <div className="flex flex-wrap gap-1">
                      {item.inventorySignals.rebootPending && (
                        <span title="Reboot pendente" className="inline-flex h-5 w-5 items-center justify-center rounded border border-rose-500/20 bg-rose-500/10 text-rose-600">
                          <RotateCcw className="h-2.5 w-2.5" />
                        </span>
                      )}
                      {item.inventorySignals.diskLow && (
                        <span title="Disco baixo" className="inline-flex h-5 w-5 items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 text-amber-600">
                          <HardDrive className="h-2.5 w-2.5" />
                        </span>
                      )}
                      {item.inventorySignals.sysproProcessDown && (
                        <span title="Serviço Syspro parado" className="inline-flex h-5 w-5 items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 text-amber-600">
                          <AlertTriangle className="h-2.5 w-2.5" />
                        </span>
                      )}
                      {item.contractErrorCode && (
                        <span title={`Contrato: ${item.contractErrorCode}`} className="inline-flex h-5 items-center rounded border border-rose-500/20 bg-rose-500/10 px-1 text-[9px] font-bold text-rose-600">
                          {item.contractErrorCode}
                        </span>
                      )}
                      {!hasSignals && <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </div>

                    {/* Métricas */}
                    <div className="space-y-0.5">
                      {hasCpu && (
                        <div className="flex items-center gap-1">
                          <Cpu className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
                          <span className="font-mono text-[10px] text-foreground/70">{item.lastAgentMetrics!.cpuLoad}%</span>
                        </div>
                      )}
                      {hasRam && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
                          <span className="font-mono text-[10px] text-foreground/70">{item.lastAgentMetrics!.ramUsedPc}%</span>
                        </div>
                      )}
                      {!hasCpu && !hasRam && <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </div>

                    {/* Heartbeat */}
                    <div>
                      <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px]", heartbeat.className)}>
                        {heartbeat.shortLabel}
                      </Badge>
                      <p
                        className="mt-0.5 text-[10px] text-muted-foreground"
                        title={formatHeartbeatDateTime(item.agent.lastHeartbeatAt, hasHydrated)}
                      >
                        {formatHeartbeatRelative(item.agent.lastHeartbeatAt, hasHydrated, referenceNow) ??
                          formatHeartbeatTime(item.agent.lastHeartbeatAt, hasHydrated)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5 px-3"
                        onClick={() => handleQuickConnect(item)}
                        disabled={!item.agent.rustdeskId || connectingHostId === item.id}
                      >
                        {connectingHostId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        Abrir
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 px-3 bg-background/70">
                        <Link href={`/portal/infraestrutura/hosts/${item.id}${initialTicketNumber ? `?ticketNumber=${encodeURIComponent(initialTicketNumber)}` : ""}`}>
                          Detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Mobile: stacked layout */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", heartbeat.dotClass)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("h-5 text-[10px]", heartbeat.className)}>{heartbeat.shortLabel}</Badge>
                          <Badge variant="outline" className={cn("h-5 text-[10px]", productStatus.className)}>{productStatus.label}</Badge>
                        </div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{installationNames[0] ?? item.companyName}</p>
                        {installationNames.length > 1 && <p className="text-xs text-muted-foreground">+{installationNames.length - 1} empresa(s)</p>}
                        {item.agent.lastKnownIp && <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">{item.agent.lastKnownIp}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-md border border-border/30 bg-muted/20 px-2 py-1.5 text-sm font-mono text-foreground/80">
                        {item.agent.rustdeskId ?? "Sem ID remoto"}
                      </code>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => handleCopyRustDeskId(item.agent.rustdeskId)} disabled={!item.agent.rustdeskId}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {hasSignals && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.inventorySignals.rebootPending && <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-700">Reboot pendente</Badge>}
                        {item.inventorySignals.diskLow && <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700">Disco baixo</Badge>}
                        {item.inventorySignals.sysproProcessDown && <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700">Serviço parado</Badge>}
                        {item.contractErrorCode && <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-700">Contrato {item.contractErrorCode}</Badge>}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="h-9 flex-1 gap-2" onClick={() => handleQuickConnect(item)} disabled={!item.agent.rustdeskId || connectingHostId === item.id}>
                        {connectingHostId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Abrir remoto
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 flex-1 bg-background/70">
                        <Link href={`/portal/infraestrutura/hosts/${item.id}${initialTicketNumber ? `?ticketNumber=${encodeURIComponent(initialTicketNumber)}` : ""}`}>
                          Ver detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table footer count */}
          <div className="border-t border-border/30 bg-muted/5 px-4 py-2.5 text-right text-[11px] text-muted-foreground">
            {displayedItems.length} de {directory.items.length} host(s)
          </div>
        </div>
      ) : !shouldShowPendingItems ? (
        <EmptyState
          icon={Monitor}
          title="Nenhum host encontrado"
          description={searchTerm ? `Nenhum resultado para "${searchTerm}".` : "Nenhum host remoto configurado no seu escopo."}
          action={hasActiveFilters ? { label: "Limpar filtros", onClick: () => { setSearchTerm(""); setScopeFilter("all"); setCompanyFilter("all"); setHeartbeatFilter("all"); setAgentFilter("all"); } } : undefined}
          dashed
          className="rounded-2xl border-border/50 bg-card/50 py-10"
        />
      ) : null}
    </div>
  );
}
