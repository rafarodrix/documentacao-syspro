"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
import { Button, buttonVariants } from "@/components/ui/button";
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

function formatDateTime(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleString("pt-BR");
}

function formatRelativeHeartbeat(value: string | null) {
  if (!value) return "Sem heartbeat";

  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes} min atras`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atras`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atras`;
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

function getReadinessMeta(item: DirectoryItem) {
  if (!item.rustdeskId) {
    return {
      label: "Sem RustDesk ID",
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "Cadastro incompleto para acesso direto.",
    };
  }

  const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
  if (heartbeat.bucket === "recent") {
    return {
      label: "Pronto para acesso",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      description: "ID valido e agente respondendo recentemente.",
    };
  }

  if (heartbeat.bucket === "stale") {
    return {
      label: "Confirmar conectividade",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "Pode funcionar, mas vale confirmar se a maquina ainda esta online.",
    };
  }

  return {
    label: "Aguardando agente",
    className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    description: "Sem heartbeat recente do agente.",
  };
}

function getOperationalAlerts(item: DirectoryItem) {
  const alerts: Array<{ label: string; className: string }> = [];

  if (!item.installToken) {
    alerts.push({
      label: "Sem token",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    });
  }

  if (!item.rustdeskId) {
    alerts.push({
      label: "Sem RustDesk ID",
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    });
  }

  if (item.openSessionCount > 0) {
    alerts.push({
      label: item.openSessionCount > 1 ? `${item.openSessionCount} sessoes abertas` : "Sessao aberta",
      className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    });
  }

  return alerts;
}

export function RemotePlatformDirectoryPanel({ directory }: { directory: RemotePlatformDirectory }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "MAINTENANCE" | "INACTIVE">("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [heartbeatFilter, setHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
  const [quickCompanyId, setQuickCompanyId] = useState(directory.companyOptions[0]?.id ?? "");
  const [quickRustdeskId, setQuickRustdeskId] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
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

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return directory.items.filter((item) => {
      const haystack = [
        item.name,
        item.companyName,
        item.environment,
        item.provider,
        item.rustdeskId,
        item.description,
        item.machineName,
        item.agentVersion,
        item.lastTicketNumber,
        item.lastSessionStatus,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
      const matchesSearch = !term || haystack.includes(term);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesEnvironment = environmentFilter === "all" || item.environment === environmentFilter;
      const matchesHeartbeat = heartbeatFilter === "all" || heartbeat.bucket === heartbeatFilter;

      return matchesSearch && matchesStatus && matchesEnvironment && matchesHeartbeat;
    });
  }, [directory.items, environmentFilter, heartbeatFilter, searchTerm, statusFilter]);

  const directoryStats = useMemo(() => {
    const ready = directory.items.filter((item) => getReadinessMeta(item).label === "Pronto para acesso").length;
    const attention = directory.items.filter((item) => getHeartbeatMeta(item.lastHeartbeatAt).bucket === "stale").length;
    const openSessions = directory.items.filter((item) => item.openSessionCount > 0).length;
    const pendingSetup = directory.items.filter((item) => !item.rustdeskId || !item.installToken).length;

    return { ready, attention, openSessions, pendingSetup };
  }, [directory.items]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
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

        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
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

        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
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

        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-rose-500" />
              Cadastro pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directoryStats.pendingSetup}</p>
            <p className="text-xs text-muted-foreground">Hosts sem token ou sem RustDesk ID completo.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-background via-muted/10 to-background">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Console de acesso remoto</CardTitle>
              <CardDescription>
                Inspirado em consoles de suporte remoto: empresa em destaque, prontidao imediata, acao principal evidente e detalhe tecnico sem esconder o que bloqueia o acesso.
              </CardDescription>
            </div>

            {canCreateHosts ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 lg:min-w-[380px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cadastro rapido de maquina</p>
                    <p className="text-xs text-muted-foreground">
                      Fluxo minimo para registrar host e gerar acesso operacional.
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
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar empresa, host, ambiente, ticket ou RustDesk ID"
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
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">Como conectar</Button>
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

            {searchTerm || statusFilter !== "all" || environmentFilter !== "all" || heartbeatFilter !== "all" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setEnvironmentFilter("all");
                  setHeartbeatFilter("all");
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            ) : null}
          </div>

          {filteredItems.length ? (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
                const readiness = getReadinessMeta(item);
                const alerts = getOperationalAlerts(item);
                const HeartbeatIcon = heartbeat.icon;
                const rustdeskHref = item.rustdeskId ? `rustdesk://${item.rustdeskId.replace(/\s+/g, "")}` : null;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/50 bg-gradient-to-r from-background via-background to-muted/20 p-5 shadow-sm transition-colors hover:border-primary/20"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr_0.8fr]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={heartbeat.className}>
                            <HeartbeatIcon className="mr-1 h-3.5 w-3.5" />
                            {heartbeat.shortLabel}
                          </Badge>
                          <Badge variant="outline" className={readiness.className}>
                            {readiness.label}
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

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xl font-semibold text-foreground">{item.companyName ?? "Sem empresa"}</p>
                            {rustdeskHref ? (
                              <a href={rustdeskHref} className={cn(buttonVariants({ variant: "default" }), "h-8 gap-1 px-3 shadow-sm")}>
                                <ExternalLink className="h-3.5 w-3.5" />
                                Acesso direto
                              </a>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium text-foreground/90">{item.description || "Sem descricao operacional."}</p>
                          <p className="text-sm text-muted-foreground">
                            Host: {item.name}
                            {item.provider ? ` | ${item.provider}` : ""}
                            {item.machineName ? ` | ${item.machineName}` : ""}
                          </p>
                        </div>

                        {alerts.length ? (
                          <div className="flex flex-wrap gap-2">
                            {alerts.map((alert) => (
                              <Badge key={alert.label} variant="outline" className={alert.className}>
                                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                                {alert.label}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        {item.notes ? (
                          <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Observacao:</span> {item.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
                          <p className="mt-1 font-mono text-sm text-foreground">{item.rustdeskId ?? "Nao configurado"}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{formatRelativeHeartbeat(item.lastHeartbeatAt)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.lastHeartbeatAt)}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo ticket</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{item.lastTicketNumber ? `#${item.lastTicketNumber}` : "Sem ticket recente"}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultima sessao</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{item.lastSessionStatus ?? "Sem historico"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.lastSessionAt)}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Leitura rapida</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{readiness.description}</p>
                        </div>

                        <Button type="button" variant="outline" size="sm" onClick={() => handleCopyRustDeskId(item.rustdeskId)} className="justify-start gap-2">
                          <Copy className="h-3.5 w-3.5" />
                          Copiar ID
                        </Button>
                        {canCreateHosts ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyPowerShellCommand(item)}
                            className="justify-start gap-2"
                            disabled={!item.installToken}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar comando
                          </Button>
                        ) : null}
                        {canCreateHosts ? (
                          <a
                            href={`/api/remote/hosts/${item.id}/installer`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start gap-2")}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Baixar script
                          </a>
                        ) : null}
                        <Link
                          href={`/app/plataforma-remota/${item.id}`}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "justify-start gap-2")}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Visualizar detalhes
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? `Nenhum host deste modulo corresponde a "${searchTerm}".`
                : "Nenhum cliente/host remoto configurado no seu escopo."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
