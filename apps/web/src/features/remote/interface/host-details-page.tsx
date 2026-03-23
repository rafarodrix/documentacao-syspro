"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Copy, ExternalLink, Signal, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RemoteHostDetails } from "@/features/remote/domain/model";

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const { host } = details;
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
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
            {host.companyName ?? "Sem empresa"}{host.environment ? ` | ${host.environment}` : ""}
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
            <p className="text-sm text-muted-foreground">{heartbeat.description}</p>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
              <p>1. Abra o RustDesk pelo botao acima.</p>
              <p>2. Se o navegador bloquear, copie o ID e conecte manualmente.</p>
              <p>3. Se a conexao falhar, valide senha do host e servidor RustDesk.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Dados do host</CardTitle>
          <CardDescription>Ponto operacional do acesso remoto ja configurado para a empresa.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">ID:</span> {host.id}</p>
            <p><span className="font-medium text-foreground">Empresa:</span> {host.companyName ?? "Sem empresa"}</p>
            <p><span className="font-medium text-foreground">Descricao:</span> {host.description || "Sem descricao operacional."}</p>
            <p><span className="font-medium text-foreground">Token de instalacao:</span> {host.installToken ?? "Nao configurado"}</p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Provider:</span> {host.provider ?? "Nao definido"}</p>
            <p><span className="font-medium text-foreground">RustDesk ID:</span> {normalizedRustdeskId ?? "Nao configurado"}</p>
            <p><span className="font-medium text-foreground">Maquina:</span> {host.machineName ?? "Nao registrada"}</p>
            <p><span className="font-medium text-foreground">Versao do agente:</span> {host.agentVersion ?? "Nao registrada"}</p>
            <p><span className="font-medium text-foreground">Ultimo heartbeat:</span> {host.lastHeartbeatAt ? new Date(host.lastHeartbeatAt).toLocaleString("pt-BR") : "Sem heartbeat"}</p>
            <p>
              <span className="font-medium text-foreground">Status:</span>{" "}
              <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                {host.status}
              </Badge>
            </p>
          </div>
        </CardContent>
      </Card>

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
