"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Copy,
  Plus,
  X,
  Building2,
  Ticket,
  Loader2,
  Monitor,
  RotateCcw,
  Info,
  AlertCircle,
  Fingerprint,
  FileText,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { normalizeSearchText } from "@dosc-syspro/shared";
import { Badge, Input, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, TableCell, TableRow, TableHead } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { EmptyState, SearchToolbar } from "@/components/patterns";
import { RegistryDataTable, RegistryFooter } from "@/components/platform/shared/registry-list-scaffold";
import type { RemotePlatformDirectory } from "@/features/remote/domain/remote-host.types";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import {
  buildHostIdentitySubtitle,
  buildPendingIdentitySubtitle,
  buildPendingTooltip,
  buildUnifiedHealthMeta,
  formatRustDeskDisplay,
  getExtraCompanyCount,
  getHeartbeatMetaAt,
  matchesPendingCompanyFilter,
  getPrimaryCompanyLabel,
} from "@/features/remote/interface/directory-page.helpers";
import { HostDirectoryActionsMenu } from "@/features/remote/interface/host-directory-actions-menu";
import {
  RemoteApiClientError,
  getRemoteApiErrorMessage,
  requestRemoteMutation,
} from "@/features/remote/interface/remote-api";
import { SearchableCompanyPicker } from "./host-details/components/searchable-company-picker";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";

type DirectoryItem = RemotePlatformDirectory["items"][number];
type PendingDirectoryItem = RemotePlatformDirectory["pendingItems"][number];
type RemotePlatformDirectoryPanelProps = {
  directory: RemotePlatformDirectory;
  initialCompanyId?: string;
  initialTicketNumber?: string;
  canManageRemote?: boolean;
};

function normalizeSearchValue(value: string | null | undefined) {
  return normalizeSearchText(value, { preserveSeparators: false });
}

function normalizeRustDeskId(value: string) {
  const compact = value.replace(/\D/g, "").trim();
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
  canManageRemote = false,
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
  const [formErrors, setFormErrors] = useState<{
    companyId?: string;
    name?: string;
    rustdeskId?: string;
  }>({});
  const [pendingCompanyById, setPendingCompanyById] = useState<Record<string, string>>({});
  const [pendingNameById, setPendingNameById] = useState<Record<string, string>>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isCreatingQuickHost, setIsCreatingQuickHost] = useState(false);

  const [linkingPendingId, setLinkingPendingId] = useState<string | null>(null);
  const [connectingHostId, setConnectingHostId] = useState<string | null>(null);
  const [hostToDelete, setHostToDelete] = useState<DirectoryItem | null>(null);
  const [isDeletingHost, setIsDeletingHost] = useState(false);
  const [ignoringPendingId, setIgnoringPendingId] = useState<string | null>(null);
  const [reactivatingPendingId, setReactivatingPendingId] = useState<string | null>(null);
  const canCreateHosts = canManageRemote;
  
  const searchParams = useSearchParams();
  const newHostParam = searchParams.get("newHost");

  const handleOpenChange = (open: boolean) => {
    setShowQuickCreate(open);
    if (!open) {
      const params = new URLSearchParams(window.location.search);
      params.delete("newHost");
      router.replace(`?${params.toString()}`, { scroll: false });
      setQuickHostName("");
      setQuickRustdeskId("");
      setQuickDescription("");
      setFormErrors({});
    }
  };

  useEffect(() => {
    if (newHostParam === "true") {
      setShowQuickCreate(true);
    }
  }, [newHostParam]);

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

    const errors: typeof formErrors = {};
    if (!quickCompanyId || quickCompanyId === "__unlinked__") {
      errors.companyId = "Selecione uma empresa válida.";
    }
    if (!quickHostName.trim()) {
      errors.name = "O nome do host é obrigatório.";
    }
    
    const cleanRustdeskId = quickRustdeskId.replace(/\D/g, "");
    if (!quickRustdeskId.trim()) {
      errors.rustdeskId = "O ID remoto é obrigatório.";
    } else if (!/^\d{7,12}$/.test(cleanRustdeskId)) {
      errors.rustdeskId = "ID inválido. Informe apenas números com 7 a 12 dígitos.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

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
            description: quickDescription.trim() || null,
            agentExternalId: cleanRustdeskId,
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
    if (linkingPendingId === id) return;

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
      setLinkingPendingId(id);
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
    } finally {
      setLinkingPendingId((current) => (current === id ? null : current));
    }
  }

  async function handleIgnoreDiscoveredHost(id: PendingDirectoryItem["id"]) {
    setIgnoringPendingId(id);
    try {
      await requestRemoteMutation({
        url: `/api/remote/discovered-hosts/${id}/ignore`,
        method: "POST",
      });
      toast.success("Máquina descoberta ignorada.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setIgnoringPendingId(null);
    }
  }

  async function handleReactivateDiscoveredHost(id: PendingDirectoryItem["id"]) {
    if (reactivatingPendingId === id) return;

    try {
      setReactivatingPendingId(id);
      await requestRemoteMutation({
        url: `/api/remote/discovered-hosts/${id}/reactivate`,
        method: "POST",
      });
      toast.success("Descoberta reautorizada. Agora o host pode ser vinculado.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setReactivatingPendingId((current) => (current === id ? null : current));
    }
  }

  async function handleDeleteHost() {
    if (!hostToDelete) return;
    setIsDeletingHost(true);
    try {
      await requestRemoteMutation({
        url: `/api/remote/hosts/${hostToDelete.id}`,
        method: "DELETE",
      });
      toast.success("Host excluído com sucesso.");
      setHostToDelete(null);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setIsDeletingHost(false);
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
        const matchesCompany = matchesPendingCompanyFilter(item, companyFilter);
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

  const displayedPendingItems = useMemo<PendingDirectoryItem[]>(() => {
    if (!canCreateHosts) return [];
    if (scopeFilter !== "discovered") return [];
    return filteredPendingItems;
  }, [canCreateHosts, filteredPendingItems, scopeFilter]);

  const totalFilteredItems = useMemo(
    () => filteredItems.length + (canCreateHosts ? filteredPendingItems.length : 0),
    [canCreateHosts, filteredItems.length, filteredPendingItems.length],
  );

  const displayedItems = useMemo(() => {
    const referenceNow = hasHydrated ? Date.now() : null;
    if (scopeFilter === "online") return filteredItems.filter((item) => getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket === "recent");
    if (scopeFilter === "offline") return filteredItems.filter((item) => { const b = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow).bucket; return b === "stale" || b === "missing"; });
    if (scopeFilter === "discovered") return [];
    return filteredItems;
  }, [filteredItems, hasHydrated, scopeFilter]);

  const shouldShowPendingItems = displayedPendingItems.length > 0;
  const visibleItemsCount = displayedItems.length + displayedPendingItems.length;
  const referenceNow = hasHydrated ? Date.now() : null;

  return (
    <div className="space-y-3">
      <SearchToolbar
        searchValue={searchTerm}
        searchPlaceholder="Buscar por host, empresa, IP, ID remoto ou ticket..."
        onSearchChange={setSearchTerm}
        onClearSearch={() => { setSearchTerm(""); }}
        resultLabel={`${visibleItemsCount} host${visibleItemsCount === 1 ? "" : "s"}`}
        filters={
          <>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-9 w-42.5 bg-background text-sm">
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
              <SelectTrigger className="h-9 w-40 bg-background text-sm">
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
              <SelectTrigger className="h-9 w-35 bg-background text-sm">
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
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "Todos", count: totalFilteredItems },
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
                    "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.02]",
                    scopeFilter === option.value
                      ? "bg-gradient-to-r from-primary to-primary/95 text-primary-foreground border-transparent shadow-sm shadow-primary/15"
                      : "border-border/50 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide", scopeFilter === option.value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
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
        }
      />

      {canCreateHosts && (
        <Dialog open={showQuickCreate} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Cadastrar Host Remoto</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Registre uma máquina manualmente para suporte assistido via RustDesk e vínculo com a empresa.
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-5 pt-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Empresa
                  </Label>
                  <SearchableCompanyPicker
                    value={quickCompanyId}
                    options={directory.companyOptions}
                    searchUrl="/api/remote/companies/search"
                    onChange={(val) => {
                      setQuickCompanyId(val);
                      if (formErrors.companyId) {
                        setFormErrors((prev) => ({ ...prev, companyId: undefined }));
                      }
                    }}
                    hideUnlinked={true}
                  />
                  {formErrors.companyId ? (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.companyId}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">Pesquise por razão social, nome fantasia ou código operacional.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome do host
                  </Label>
                  <Input
                    value={quickHostName}
                    onChange={(e) => {
                      setQuickHostName(e.target.value);
                      if (formErrors.name) {
                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="Ex.: SERVIDOR MATRIZ"
                    className={cn(formErrors.name && "border-destructive focus-visible:ring-destructive/30")}
                  />
                  {formErrors.name && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                    RustDesk ID
                  </Label>
                  <Input
                    value={quickRustdeskId}
                    onChange={(e) => {
                      setQuickRustdeskId(e.target.value);
                      if (formErrors.rustdeskId) {
                        setFormErrors((prev) => ({ ...prev, rustdeskId: undefined }));
                      }
                    }}
                    placeholder="Ex.: 211 876 200 68"
                    className={cn(formErrors.rustdeskId && "border-destructive focus-visible:ring-destructive/30")}
                  />
                  {formErrors.rustdeskId ? (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.rustdeskId}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">O portal valida identificadores de 7 a 12 dígitos.</p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Descrição Operacional <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>
                  </Label>
                  <Input
                    list="quick-description-options"
                    value={quickDescription}
                    onChange={(e) => setQuickDescription(e.target.value)}
                    placeholder="Ex.: ERP matriz / servidor fiscal"
                  />
                  <datalist id="quick-description-options">
                    {QUICK_DESCRIPTION_TEMPLATES.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-start gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse mt-1" />
                    Visualização Operacional
                  </span>
                  {/* ds-allow: status */}
                  <Badge variant="outline" className="h-5 border-emerald-500/20 bg-emerald-500/10 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                    Host Manual
                  </Badge>
                </div>
                <div className="grid gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Empresa:</span>
                    <span className="font-semibold text-foreground truncate">
                      {directory.companyOptions.find((c) => c.id === quickCompanyId)?.label ?? (
                        <span className="text-muted-foreground/60 font-normal italic">Nenhuma empresa selecionada</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Nome do Host:</span>
                    <span className="font-semibold text-foreground truncate">
                      {quickHostName.trim() || (
                        <span className="text-muted-foreground/60 font-normal italic">Não informado</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">ID RustDesk:</span>
                    {quickRustdeskId.trim() ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold border border-border/30 text-primary tracking-wider">
                        {quickRustdeskId.replace(/\D/g, "") || quickRustdeskId}
                      </code>
                    ) : (
                      <span className="text-muted-foreground/60 font-normal italic">Não informado</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4">
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Para máquinas que possuem o Agente Trilink instalado, prefira a vinculação automática.
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isCreatingQuickHost} size="sm">
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleQuickCreateHost} disabled={isPending || isCreatingQuickHost} size="sm" className="gap-1.5 shadow-sm">
                    {isCreatingQuickHost ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Cadastrar Host
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Pending items ── */}
      {shouldShowPendingItems && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm shadow-amber-500/5 backdrop-blur-md transition-all duration-300">
          <div className="flex w-full items-center justify-between px-4 py-3.5 border-b border-amber-500/20">
            <div>
              <p className="text-sm font-semibold text-foreground">Hosts sem vínculo</p>
              <p className="text-xs text-muted-foreground">Descobertos automaticamente pelo agente e aguardando definição da empresa no portal.</p>
            </div>
            <Badge variant="outline" className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 shadow-sm">
              {displayedPendingItems.length}
            </Badge>
          </div>

          <div className="px-2 py-3">
              <div className="hidden md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,220px)_auto] md:gap-2 md:px-2 md:pb-1 md:text-[10px] md:font-semibold md:uppercase md:tracking-wide md:text-muted-foreground">
                <span>Maquina</span>
                <span>Empresa</span>
                <span>Nome do host</span>
                <span className="text-right">Acoes</span>
              </div>
              <div className="divide-y divide-amber-500/10">
                {displayedPendingItems.map((item) => {
                  const selectedCompanyId = pendingCompanyById[item.id] ?? directory.companyOptions[0]?.id ?? "";
                  const proposedHostName = (pendingNameById[item.id] ?? item.machineName ?? "").trim();
                  const isIgnoredPendingHost = item.status === "IGNORED";
                  const canLinkPendingHost = !isIgnoredPendingHost && Boolean(selectedCompanyId && proposedHostName);
                  const isLinkingPendingHost = linkingPendingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="grid gap-2 px-2 py-2.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,220px)_auto] md:items-center md:gap-2"
                    >
                      <div className="min-w-0" title={buildPendingTooltip(item)}>
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.machineName ?? "Maquina sem nome"}
                          </p>
                          {isIgnoredPendingHost && (
                            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                              Bloqueado
                            </Badge>
                          )}
                          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {buildPendingIdentitySubtitle(item)}
                        </p>
                        {isIgnoredPendingHost && (
                          <p className="mt-1 text-[11px] text-destructive/90">
                            Esta descoberta foi ignorada/removida anteriormente e precisa ser reautorizada antes do vinculo.
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <SearchableCompanyPicker
                          value={selectedCompanyId}
                          options={directory.companyOptions}
                          searchUrl="/api/remote/companies/search"
                          onChange={(value) => setPendingCompanyById((curr) => ({ ...curr, [item.id]: value }))}
                        />
                      </div>

                      <Input
                        value={pendingNameById[item.id] ?? item.machineName ?? ""}
                        onChange={(e) => setPendingNameById((curr) => ({ ...curr, [item.id]: e.target.value }))}
                        placeholder="Nome do host"
                        className="h-9"
                      />

                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" asChild className="h-8">
                          <Link href={`/portal/infraestrutura/hosts/descobertos/${item.id}`}>
                            Detalhes
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={
                            isIgnoredPendingHost
                              ? () => void handleReactivateDiscoveredHost(item.id)
                              : () => handleLinkDiscoveredHost(item.id, item.machineName)
                          }
                          disabled={
                            isIgnoredPendingHost
                              ? reactivatingPendingId === item.id
                              : !canLinkPendingHost || isLinkingPendingHost
                          }
                          className="h-8"
                        >
                          {isIgnoredPendingHost ? (
                            reactivatingPendingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reautorizar"
                          ) : isLinkingPendingHost ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Vincular"
                          )}
                        </Button>
                        {canManageRemote && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleIgnoreDiscoveredHost(item.id)}
                            disabled={ignoringPendingId === item.id}
                            className="h-8"
                          >
                            {ignoringPendingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Ignorar"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      )}

      {/* ── Host table ── */}
      {displayedItems.length ? (
        <div className="space-y-4">
          <RegistryDataTable
            isEmpty={false}
            emptyState={{
              icon: Monitor,
              title: "Nenhum host encontrado",
              description: searchTerm ? `Nenhum resultado para "${searchTerm}".` : "Nenhum host remoto configurado no seu escopo.",
            }}
            desktopColSpan={5}
            flexible={true}
            desktopHeader={
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-0">Host</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-0">Empresa</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36">Remoto</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-44">Saúde</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36 text-right">Ações</TableHead>
              </TableRow>
            }
            desktopContent={displayedItems.map((item) => {
              const health = buildUnifiedHealthMeta(item, referenceNow, hasHydrated);
              const companyLabel = getPrimaryCompanyLabel(item);
              const extraCompanies = getExtraCompanyCount(item);
              const identitySubtitle = buildHostIdentitySubtitle(item);
              const rustdeskDisplay = formatRustDeskDisplay(item.agent.rustdeskId);
              const detailsHref = `/portal/infraestrutura/hosts/${item.id}${initialTicketNumber ? `?ticketNumber=${encodeURIComponent(initialTicketNumber)}` : ""}`;

              return (
                <TableRow key={item.id} className="group/row transition-all duration-200 hover:bg-muted/20 hover:shadow-sm">
                  <TableCell className="min-w-0 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="relative mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                        {health.label === "Pronto" || health.label === "Contato recente" || health.label === "Em atendimento" ? (
                          <>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                          </>
                        ) : health.label === "Atenção" ? (
                          <>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
                          </>
                        ) : health.label === "Provisionando" ? (
                          <>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]" />
                          </>
                        ) : (
                          <div className={cn("h-2 w-2 shrink-0 rounded-full", health.dotClass)} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{identitySubtitle}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="min-w-0 py-2.5">
                    <p className="truncate text-sm text-foreground">{companyLabel}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {extraCompanies > 0 && (
                        <span className="text-[10px] text-muted-foreground">+{extraCompanies} empresa(s)</span>
                      )}
                      {item.lastTicketNumber && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary/80">
                          <Ticket className="h-2.5 w-2.5" />#{item.lastTicketNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="w-36 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <code className="min-w-0 truncate font-mono text-[11px] font-bold bg-muted/40 text-foreground/80 border border-border/30 rounded px-1.5 py-0.5 tracking-wider">{rustdeskDisplay}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-muted/85"
                        onClick={() => handleCopyRustDeskId(item.agent.rustdeskId)}
                        disabled={!item.agent.rustdeskId}
                        title="Copiar ID remoto"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="w-44 py-2.5">
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-medium", health.className)}>
                      {health.label}
                    </Badge>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{health.detail}</p>
                  </TableCell>

                  <TableCell className="w-36 py-2.5 text-right">
                    <HostDirectoryActionsMenu
                      hostId={item.id}
                      canOpenRemote={Boolean(item.agent.rustdeskId)}
                      isOpeningRemote={connectingHostId === item.id}
                      canManageRemote={canManageRemote}
                      detailsHref={detailsHref}
                      onOpenRemote={() => handleQuickConnect(item)}
                      onDelete={() => setHostToDelete(item)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            mobileContent={displayedItems.map((item) => {
              const health = buildUnifiedHealthMeta(item, referenceNow, hasHydrated);
              const companyLabel = getPrimaryCompanyLabel(item);
              const extraCompanies = getExtraCompanyCount(item);
              const identitySubtitle = buildHostIdentitySubtitle(item);
              const rustdeskDisplay = formatRustDeskDisplay(item.agent.rustdeskId);
              const detailsHref = `/portal/infraestrutura/hosts/${item.id}${initialTicketNumber ? `?ticketNumber=${encodeURIComponent(initialTicketNumber)}` : ""}`;

              return (
                <div key={item.id} className="px-4 py-4 transition-colors hover:bg-muted/10">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", health.dotClass)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("h-5 text-[10px]", health.className)}>
                            {health.label}
                          </Badge>
                        </div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{identitySubtitle}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {companyLabel}
                          {extraCompanies > 0 ? ` · +${extraCompanies} empresa(s)` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-md border border-border/30 bg-muted/20 px-2 py-1.5 text-sm font-mono text-foreground/80">
                        {rustdeskDisplay}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleCopyRustDeskId(item.agent.rustdeskId)}
                        disabled={!item.agent.rustdeskId}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">{health.detail}</p>

                    <HostDirectoryActionsMenu
                      hostId={item.id}
                      canOpenRemote={Boolean(item.agent.rustdeskId)}
                      isOpeningRemote={connectingHostId === item.id}
                      canManageRemote={canManageRemote}
                      detailsHref={detailsHref}
                      onOpenRemote={() => handleQuickConnect(item)}
                      onDelete={() => setHostToDelete(item)}
                    />
                  </div>
                </div>
              );
            })}
          />

          <RegistryFooter
            filtered={visibleItemsCount}
            total={directory.items.length + (canCreateHosts ? directory.pendingItems.length : 0)}
            singular="host"
            plural="hosts"
            searchTerm={searchTerm}
            onClearSearch={() => setSearchTerm("")}
          />
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

      <ConfirmActionDialog
        open={Boolean(hostToDelete)}
        onOpenChange={(open) => {
          if (!open) setHostToDelete(null);
        }}
        title="Excluir host?"
        description={
          hostToDelete
            ? `O host "${hostToDelete.name}" será removido permanentemente do portal. O agente precisará ser revinculado ou reinstalado para voltar a operar neste cadastro.`
            : ""
        }
        confirmLabel="Excluir host"
        cancelLabel="Cancelar"
        isLoading={isDeletingHost}
        variant="danger"
        onConfirm={() => void handleDeleteHost()}
      />
    </div>
  );
}
