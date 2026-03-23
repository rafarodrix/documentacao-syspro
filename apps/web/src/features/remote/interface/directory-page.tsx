"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, Download, ExternalLink, Plus, Search, Wifi, WifiOff, X } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Clientes/hosts configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directory.stats.totalHosts}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Hosts ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directory.stats.activeHosts}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Empresas no escopo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directory.stats.companies}</p>
            <p className="text-sm text-muted-foreground">{directory.tenantScope.summary}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Acesso remoto</CardTitle>
          <CardDescription>
            Tela operacional simplificada para localizar a empresa, validar o `RustDesk ID` e abrir o acesso com o menor atrito possivel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canCreateHosts ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cadastro rapido de maquina</p>
                    <p className="text-xs text-muted-foreground">
                      Empresa, RustDesk ID e descricao minima para registrar uma nova maquina.
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => setShowQuickCreate((current) => !current)} className="gap-2">
                  {showQuickCreate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showQuickCreate ? "Fechar cadastro" : "Cadastrar maquina"}
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
                      <Input value={quickDescription} onChange={(event) => setQuickDescription(event.target.value)} placeholder="Servidor principal do ERP" />
                    </div>
                  </div>
                  <div>
                    <Button onClick={handleQuickCreateHost} disabled={isPending} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Confirmar cadastro
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Pesquisar host, empresa, ambiente ou RustDesk ID"
                  className="pl-9"
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">Como conectar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Como conectar</DialogTitle>
                    <DialogDescription>Passos curtos para o suporte abrir uma sessao remota sem perder tempo.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>1. Confira se o host tem `RustDesk ID` configurado.</p>
                    <p>2. Prefira hosts com heartbeat recente.</p>
                    <p>3. Clique em `Copiar ID` ou acesse o detalhe do host.</p>
                    <p>4. Se o navegador bloquear, abra o RustDesk manualmente e cole o ID.</p>
                    <p>5. Se falhar, valide senha do host e servidor RustDesk.</p>
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

            <div className="flex flex-col gap-2 md:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
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
          </div>

          {filteredItems.length ? (
            filteredItems.map((item) => {
              const heartbeat = getHeartbeatMeta(item.lastHeartbeatAt);
              const HeartbeatIcon = heartbeat.icon;
              const rustdeskHref = item.rustdeskId ? `rustdesk://${item.rustdeskId.replace(/\s+/g, "")}` : null;

              return (
                <div key={item.id} className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{item.companyName ?? "Sem empresa"}</p>
                        <Badge variant="outline" className={heartbeat.className}>
                          <HeartbeatIcon className="mr-1 h-3.5 w-3.5" />
                          {heartbeat.label}
                        </Badge>
                        <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                          {item.status}
                        </Badge>
                        {rustdeskHref ? (
                          <a href={rustdeskHref} className={cn(buttonVariants({ variant: "outline" }), "h-8 gap-1 px-3")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Acesso direto
                          </a>
                        ) : null}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>RustDesk ID: {item.rustdeskId ?? "Nao configurado"}</p>
                        <p>Descricao: {item.description || "Sem descricao operacional."}</p>
                        {item.lastSessionAt ? (
                          <p>
                            Ultima sessao: {new Date(item.lastSessionAt).toLocaleString("pt-BR")}
                            {item.lastTicketNumber ? ` | Ticket #${item.lastTicketNumber}` : ""}
                          </p>
                        ) : null}
                        {item.machineName || item.agentVersion ? (
                          <p>
                            {item.machineName ?? "Maquina indefinida"}
                            {item.agentVersion ? ` | ${item.agentVersion}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleCopyRustDeskId(item.rustdeskId)} className="gap-1">
                        <Copy className="h-3.5 w-3.5" />
                        Copiar ID
                      </Button>
                      {canCreateHosts ? (
                        <a
                          href={`/api/remote/hosts/${item.id}/installer`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Baixar script
                        </a>
                      ) : null}
                      <Link
                        href={`/app/plataforma-remota/${item.id}`}
                        className={cn(buttonVariants({ variant: "default" }), "gap-1")}
                      >
                        Visualizar
                      </Link>
                    </div>
                  </div>
                </div>
              )})
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
