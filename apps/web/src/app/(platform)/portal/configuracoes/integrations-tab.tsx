"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, HardDrive, Loader2, MessageSquare, RefreshCw, Server, TriangleAlert } from "lucide-react";

import EvolutionSettingsTab from "./evolution-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type IntegrationDiagnostics = {
  success: boolean;
  chatwoot?: {
    configured: boolean;
    source: string | null;
    activeConnections: number;
    runtime: Record<string, boolean>;
    diagnostics: unknown;
  };
  storage?: {
    provider: string;
    configured: boolean;
    mode: "public_base_url" | "signed_url";
    endpointHost: string | null;
    bucketName: string | null;
    publicBaseUrl: string | null;
    signedUrlTtlSeconds: number;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    issues: string[];
  };
  error?: string;
};

export function IntegrationsSettingsTab() {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Integracoes</h2>
        <p className="text-sm text-muted-foreground">
          Centralize os conectores operacionais do portal. Secrets sensiveis continuam protegidos no backend/runtime.
        </p>
      </div>

      <Tabs defaultValue="chatwoot" className="space-y-5">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="chatwoot" className="gap-2 px-4 py-2">
            <MessageSquare className="h-4 w-4" />
            Chatwoot
          </TabsTrigger>
          <TabsTrigger value="evolution" className="gap-2 px-4 py-2">
            <Bot className="h-4 w-4" />
            Evolution
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2 px-4 py-2">
            <HardDrive className="h-4 w-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatwoot" className="focus-visible:ring-0">
          <ChatwootDiagnosticsTab />
        </TabsContent>

        <TabsContent value="evolution" className="focus-visible:ring-0">
          <EvolutionSettingsTab />
        </TabsContent>

        <TabsContent value="storage" className="focus-visible:ring-0">
          <StorageDiagnosticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatwootDiagnosticsTab() {
  const { diagnostics, isLoading, reload } = useIntegrationDiagnostics();
  const chatwoot = diagnostics?.chatwoot;
  const runtime = chatwoot?.runtime ?? {};

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chatwoot
          </CardTitle>
          <CardDescription>
            Diagnostico seguro da integracao usada para atendimento, inbox e roteamento de mensagens.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recarregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <LoadingState label="Carregando diagnostico do Chatwoot..." />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusTile label="Status" ok={Boolean(chatwoot?.configured)} okText="Configurado" failText="Incompleto" />
              <InfoTile label="Origem" value={chatwoot?.source || "N/A"} />
              <InfoTile label="Conexoes ativas" value={String(chatwoot?.activeConnections ?? 0)} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(runtime).map(([key, value]) => (
                <StatusLine key={key} label={formatRuntimeKey(key)} ok={value} />
              ))}
            </div>

            <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              {JSON.stringify(chatwoot?.diagnostics ?? { info: "Nenhum contexto ativo resolvido." }, null, 2)}
            </pre>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StorageDiagnosticsTab() {
  const { diagnostics, isLoading, reload } = useIntegrationDiagnostics();
  const storage = diagnostics?.storage;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Storage / Cloudflare R2
          </CardTitle>
          <CardDescription>
            Diagnostico das variaveis de ambiente usadas para anexos de midia. Secrets nao sao exibidos.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recarregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <LoadingState label="Carregando diagnostico do storage..." />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusTile label="Status" ok={Boolean(storage?.configured)} okText="Configurado" failText="Incompleto" />
              <InfoTile label="Modo" value={storage?.mode === "public_base_url" ? "URL publica" : "URL assinada"} />
              <InfoTile label="TTL URL assinada" value={`${storage?.signedUrlTtlSeconds ?? 900}s`} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoTile label="Provider" value={storage?.provider || "Cloudflare R2"} />
              <InfoTile label="Endpoint" value={storage?.endpointHost || "N/A"} />
              <InfoTile label="Bucket" value={storage?.bucketName || "N/A"} />
              <InfoTile label="Public Base URL" value={storage?.publicBaseUrl || "Nao configurado"} />
              <StatusLine label="Access Key ID" ok={Boolean(storage?.hasAccessKeyId)} />
              <StatusLine label="Secret Access Key" ok={Boolean(storage?.hasSecretAccessKey)} />
            </div>

            {storage?.issues?.length ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <TriangleAlert className="h-4 w-4" />
                  Pontos de atencao
                </div>
                <ul className="space-y-1">
                  {storage.issues.map((issue) => (
                    <li key={issue}>- {issue}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                Configuracao minima do R2 presente no runtime.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function useIntegrationDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<IntegrationDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void requestIntegrationDiagnostics(setDiagnostics, setIsLoading);
  }, []);

  return {
    diagnostics,
    isLoading,
    reload: () => requestIntegrationDiagnostics(setDiagnostics, setIsLoading),
  };
}

async function requestIntegrationDiagnostics(
  setDiagnostics: (value: IntegrationDiagnostics) => void,
  setIsLoading: (value: boolean) => void,
) {
  setIsLoading(true);
  try {
    const response = await fetch("/api/platform/settings/integrations/diagnostics", { method: "GET", cache: "no-store" });
    const json = (await response.json()) as IntegrationDiagnostics;
    setDiagnostics(json);
  } catch {
    setDiagnostics({ success: false, error: "Falha ao carregar diagnostico." });
  } finally {
    setIsLoading(false);
  }
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function StatusTile({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <Badge variant="outline" className={ok ? "mt-2 border-emerald-500/40 text-emerald-600" : "mt-2 border-amber-500/40 text-amber-600"}>
        {ok ? okText : failText}
      </Badge>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span className={ok ? "inline-flex items-center gap-1 text-emerald-600" : "inline-flex items-center gap-1 text-amber-600"}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
        {ok ? "OK" : "Pendente"}
      </span>
    </div>
  );
}

function formatRuntimeKey(key: string) {
  return key
    .replace(/^has/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}
