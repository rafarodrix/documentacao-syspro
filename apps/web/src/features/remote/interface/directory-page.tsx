"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Search, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "MAINTENANCE" | "INACTIVE">("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [heartbeatFilter, setHeartbeatFilter] = useState<"all" | "recent" | "stale" | "missing">("all");
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
          <CardTitle className="text-lg">Clientes configurados</CardTitle>
          <CardDescription>
            Esta tela e operacional. A busca abaixo pesquisa somente os hosts deste modulo. A configuracao de hosts e vinculacoes fica em Configuracoes &gt; Acesso Remoto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

              return (
              <div key={item.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                        {item.status}
                      </Badge>
                      <Badge variant="outline" className={heartbeat.className}>
                        <HeartbeatIcon className="mr-1 h-3.5 w-3.5" />
                        {heartbeat.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                    <p className="text-sm text-muted-foreground">Empresa: {item.companyName ?? "Sem empresa"}</p>
                    <p className="text-sm text-muted-foreground">
                      Descricao: {item.description || "Host sem descricao operacional."}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>RustDesk ID: {item.rustdeskId ?? "Nao configurado"}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleCopyRustDeskId(item.rustdeskId)} className="h-7 gap-1 px-2">
                        <Copy className="h-3.5 w-3.5" />
                        Copiar ID
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Agente: {item.machineName ?? "maquina indefinida"}
                      {item.agentVersion ? ` | versao ${item.agentVersion}` : ""}
                      {item.lastHeartbeatAt ? ` | heartbeat ${new Date(item.lastHeartbeatAt).toLocaleString("pt-BR")}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sessoes abertas: {item.openSessionCount}
                      {item.lastSessionAt ? ` | Ultima atividade: ${new Date(item.lastSessionAt).toLocaleString("pt-BR")}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ultima sessao: {item.lastSessionStatus ?? "Sem sessoes"}
                      {item.lastTicketNumber ? ` | Ticket #${item.lastTicketNumber}` : ""}
                    </p>
                  </div>

                  <Link
                    href={`/app/plataforma-remota/${item.id}`}
                    className={cn(buttonVariants({ variant: "default" }), "w-full lg:w-auto")}
                  >
                    Acessar
                  </Link>
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
