"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Copy, ExternalLink, Signal, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { RemoteHostDetails } from "@/features/remote/domain/model";

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const { host } = details;
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  const statusLabel = host.status === "ACTIVE" ? "Ativo" : host.status === "MAINTENANCE" ? "Manutenção" : "Inativo";
  const heartbeat = useMemo(() => {
    if (!host.lastHeartbeatAt) {
      return {
        label: "Sem heartbeat",
        tone: "border-border/60 bg-background/70 text-foreground",
        description: "O agente ainda nao registrou atividade recente no portal.",
      };
    }

    const diffMs = Date.now() - new Date(host.lastHeartbeatAt).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes <= 5) {
      return {
        label: "Online recente",
        tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        description: "Heartbeat recente. O host tende a estar pronto para operacao.",
      };
    }

    if (diffMinutes <= 60) {
      return {
        label: "Heartbeat antigo",
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
        description: "O host respondeu antes, mas vale confirmar se o agente ainda esta online.",
      };
    }

    return {
      label: "Sem resposta recente",
      tone: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
      description: "O ultimo heartbeat esta antigo. Validar conectividade antes da sessao.",
    };
  }, [host.lastHeartbeatAt]);

  const readiness = useMemo(() => {
    if (!normalizedRustdeskId) {
      return {
        label: "Sem RustDesk ID",
        tone: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
        description: "O host ainda nao tem identificador RustDesk valido para acesso direto.",
      };
    }

    if (!host.lastHeartbeatAt) {
      return {
        label: "Sem heartbeat",
        tone: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
        description: "O agente ainda nao reportou atividade. Validar instalacao e conectividade.",
      };
    }

    const diffMinutes = Math.floor((Date.now() - new Date(host.lastHeartbeatAt).getTime()) / 60000);
    if (diffMinutes <= 5) {
      return {
        label: "Pronto para acesso",
        tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        description: "Host com RustDesk ID e heartbeat recente. Fluxo pronto para suporte.",
      };
    }

    return {
      label: "Heartbeat antigo",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
      description: "O acesso pode funcionar, mas convem confirmar conectividade antes da sessao.",
    };
  }, [host.lastHeartbeatAt, normalizedRustdeskId]);

  const operationalAlerts = useMemo(() => {
    const alerts: Array<{ label: string; tone: string }> = [];

    if (!host.installToken) {
      alerts.push({
        label: "Sem token de instalacao",
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      });
    }

    if (!normalizedRustdeskId) {
      alerts.push({
        label: "Sem RustDesk ID",
        tone: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
      });
    }

    if (host.openSessionCount > 0) {
      alerts.push({
        label: host.openSessionCount > 1 ? `${host.openSessionCount} sessoes abertas` : "Sessao aberta",
        tone: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      });
    }

    return alerts;
  }, [host.installToken, host.openSessionCount, normalizedRustdeskId]);

  async function handleCopy(value: string | null, label: string) {
    if (!value) {
      toast.error(`${label} nao configurado.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Falha ao copiar ${label.toLowerCase()}.`);
    }
  }

  function handleOpenRustDesk() {
    if (!rustdeskHref) {
      toast.error("RustDesk ID nao configurado.");
      return;
    }

    window.location.assign(rustdeskHref);
    window.setTimeout(() => {
      toast("Se o RustDesk nao abrir, copie o ID e conecte manualmente no aplicativo.");
    }, 600);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{host.name}</h1>
          <p className="text-muted-foreground">
            {host.companyName ?? "Sem empresa"}{host.environment ? ` | ${host.environment}` : ""}{` | ${statusLabel}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/app/plataforma-remota" className={cn(buttonVariants({ variant: "outline" }))}>
            Voltar
          </Link>
          {rustdeskHref ? (
            <Button onClick={handleOpenRustDesk} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir acesso remoto
            </Button>
          ) : (
            <Button disabled>RustDesk nao configurado</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <WandSparkles className="h-5 w-5 text-primary" />
              Acoes rapidas
            </CardTitle>
            <CardDescription>Atalhos para operacao imediata quando o suporte precisar entrar no host.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button onClick={handleOpenRustDesk} disabled={!rustdeskHref} className="justify-start gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir RustDesk
            </Button>
            <Button variant="outline" onClick={() => handleCopy(normalizedRustdeskId, "RustDesk ID")} className="justify-start gap-2">
              <Copy className="h-4 w-4" />
              Copiar RustDesk ID
            </Button>
            <Button variant="outline" onClick={() => handleCopy(host.installToken, "Token de instalacao")} className="justify-start gap-2">
              <Copy className="h-4 w-4" />
              Copiar token
            </Button>
            <Link href="/app/plataforma-remota" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2")}>
              <Signal className="h-4 w-4" />
              Voltar ao diretorio
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Prontidao operacional</CardTitle>
            <CardDescription>Leitura rapida para saber se o host esta apto para suporte agora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className={heartbeat.tone}>
              {heartbeat.label}
            </Badge>
            <Badge variant="outline" className={readiness.tone}>
              {readiness.label}
            </Badge>
            {operationalAlerts.length ? (
              <div className="flex flex-wrap gap-2">
                {operationalAlerts.map((alert) => (
                  <Badge key={alert.label} variant="outline" className={alert.tone}>
                    <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                    {alert.label}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">{readiness.description}</p>
            <p className="text-sm text-muted-foreground">{heartbeat.description}</p>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
              <p>1. Abra o RustDesk pelo botao acima.</p>
              <p>2. Se o navegador bloquear, copie o ID e conecte manualmente.</p>
              <p>3. Se a conexao falhar, valide senha do host e servidor RustDesk.</p>
              {host.openSessionCount > 0 ? <p>4. Ja existe sessao aberta para este host. Validar antes de iniciar nova operacao.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 md:grid-cols-3">
          <TabsTrigger value="empresa">Dados da empresa</TabsTrigger>
          <TabsTrigger value="clientes">Clientes vinculados</TabsTrigger>
          <TabsTrigger value="observacoes">Dados e observacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Dados da empresa</CardTitle>
              <CardDescription>Resumo da empresa vinculada ao host remoto.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Empresa:</span> {details.company.nomeFantasia ?? details.company.razaoSocial}</p>
                <p><span className="font-medium text-foreground">Razao social:</span> {details.company.razaoSocial}</p>
                <p><span className="font-medium text-foreground">CNPJ:</span> {details.company.cnpj}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">E-mail:</span> {details.company.emailContato ?? "Nao informado"}</p>
                <p><span className="font-medium text-foreground">Telefone:</span> {details.company.telefone ?? "Nao informado"}</p>
                <p><span className="font-medium text-foreground">Host ID:</span> {host.id}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Clientes vinculados a empresa</CardTitle>
              <CardDescription>Usuarios ativos vinculados a empresa para contexto operacional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {details.linkedUsers.length ? (
                details.linkedUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <p className="text-sm font-medium text-foreground">{user.name ?? user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Perfil: {user.role}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum usuario ativo vinculado a esta empresa.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observacoes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Dados e observacoes</CardTitle>
              <CardDescription>Espaco de referencia operacional do host e da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Descricao da maquina:</span> {host.description || "Sem descricao operacional."}</p>
                <p><span className="font-medium text-foreground">Observacoes do host:</span> {host.notes ?? "Sem observacoes manuais do host."}</p>
                <p><span className="font-medium text-foreground">Token de instalacao:</span> {host.installToken ?? "Nao configurado"}</p>
                <p><span className="font-medium text-foreground">Provider:</span> {host.provider ?? "Nao definido"}</p>
                <p><span className="font-medium text-foreground">RustDesk ID:</span> {normalizedRustdeskId ?? "Nao configurado"}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Maquina:</span> {host.machineName ?? "Nao registrada"}</p>
                <p><span className="font-medium text-foreground">Versao do agente:</span> {host.agentVersion ?? "Nao registrada"}</p>
                <p><span className="font-medium text-foreground">Ultimo heartbeat:</span> {host.lastHeartbeatAt ? new Date(host.lastHeartbeatAt).toLocaleString("pt-BR") : "Sem heartbeat"}</p>
                <p><span className="font-medium text-foreground">Observacoes da empresa:</span> {details.company.observacoes ?? "Sem observacoes cadastradas."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Sessoes recentes</CardTitle>
          <CardDescription>Historico recente do host com vinculo explicito ao ticket quando existir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {details.recentSessions.length ? (
            details.recentSessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{session.hostName}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado por {session.requestedByName ?? session.requestedByUserId}
                    </p>
                    {session.ticketNumber && (
                      <p className="text-xs text-muted-foreground">Ticket #{session.ticketNumber}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {session.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma sessao registrada para este host ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
