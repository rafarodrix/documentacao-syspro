"use client";

import { HardDrive, Loader2, RefreshCw, Save, Server, TriangleAlert } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input } from "@dosc-syspro/ui";
import { useIntegrationDiagnostics } from "../hooks/use-integration-diagnostics";
import { useStorageSettings } from "../hooks/use-storage-settings";
import { LoadingState, InfoTile, StatusTile, StatusLine } from "../integrations-primitives";
import { FormField } from "../integration-form-primitives";
import { StorageModuleCard } from "./storage-module-card";

export function StorageDiagnosticsTab() {
  const { diagnostics, isLoading, reload } = useIntegrationDiagnostics();
  const {
    settings,
    isLoading: isSettingsLoading,
    isSaving,
    setSettings,
    save,
  } = useStorageSettings();
  const storage = diagnostics?.storage;

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden border-border/40 bg-card/75 shadow-sm backdrop-blur-md dark:bg-zinc-950/45">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              Storage / Cloudflare R2
            </CardTitle>
            <CardDescription>
              Configure o provider de anexos por modulo, com bucket e pasta separados para tickets, Evolution e Chatwoot.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Recarregar
            </Button>
            <Button size="sm" onClick={save} disabled={isSettingsLoading || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar storage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isSettingsLoading ? (
            <LoadingState label="Carregando configuracao do storage..." />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField id="storage-endpoint" label="Endpoint R2">
                  <Input
                    id="storage-endpoint"
                    value={settings.endpoint}
                    onChange={(event) => setSettings((prev) => ({ ...prev, endpoint: event.target.value }))}
                    placeholder="https://<accountid>.r2.cloudflarestorage.com"
                  />
                </FormField>
                <FormField id="storage-default-bucket" label="Bucket padrao">
                  <Input
                    id="storage-default-bucket"
                    value={settings.defaultBucketName}
                    onChange={(event) => setSettings((prev) => ({ ...prev, defaultBucketName: event.target.value }))}
                    placeholder="syspro-midias"
                  />
                </FormField>
                <FormField id="storage-access-key-id" label="Access Key ID">
                  <Input
                    id="storage-access-key-id"
                    type="password"
                    value={settings.accessKeyId}
                    onChange={(event) => setSettings((prev) => ({ ...prev, accessKeyId: event.target.value }))}
                    placeholder="Access Key ID do R2"
                  />
                </FormField>
                <FormField id="storage-secret-access-key" label="Secret Access Key">
                  <Input
                    id="storage-secret-access-key"
                    type="password"
                    value={settings.secretAccessKey}
                    onChange={(event) => setSettings((prev) => ({ ...prev, secretAccessKey: event.target.value }))}
                    placeholder="Secret Access Key do R2"
                  />
                </FormField>
                <FormField id="storage-public-base-url" label="Public Base URL padrao">
                  <Input
                    id="storage-public-base-url"
                    value={settings.defaultPublicBaseUrl}
                    onChange={(event) => setSettings((prev) => ({ ...prev, defaultPublicBaseUrl: event.target.value }))}
                    placeholder="https://cdn.seudominio.com"
                  />
                </FormField>
                <FormField id="storage-signed-url-ttl" label="TTL da URL assinada (segundos)">
                  <Input
                    id="storage-signed-url-ttl"
                    type="number"
                    min={60}
                    max={86400}
                    value={settings.signedUrlTtlSeconds}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        signedUrlTtlSeconds: Number(event.target.value || prev.signedUrlTtlSeconds),
                      }))
                    }
                  />
                </FormField>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Fallback para banco</p>
                    <p className="text-xs text-muted-foreground">
                      Mantem anexos funcionando quando o storage nao estiver configurado ou estiver indisponivel.
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.fallbackToDatabase}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, fallbackToDatabase: checked === true }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <StorageModuleCard
                  title="Tickets"
                  description="Separe anexos do portal de suporte do restante."
                  values={settings.modules.tickets}
                  onChange={(next) => setSettings((prev) => ({ ...prev, modules: { ...prev.modules, tickets: next } }))}
                  defaultPrefix="tickets"
                />
                <StorageModuleCard
                  title="Evolution"
                  description="Midias recebidas do WhatsApp/Evolution antes do repasse."
                  values={settings.modules.evolution}
                  onChange={(next) => setSettings((prev) => ({ ...prev, modules: { ...prev.modules, evolution: next } }))}
                  defaultPrefix="evolution-media"
                />
                <StorageModuleCard
                  title="Chatwoot"
                  description="Reservado para anexos e arquivos do fluxo Chatwoot."
                  values={settings.modules.chatwoot}
                  onChange={(next) => setSettings((prev) => ({ ...prev, modules: { ...prev.modules, chatwoot: next } }))}
                  defaultPrefix="chatwoot-media"
                />
                <StorageModuleCard
                  title="Padrao"
                  description="Usado por modulos sem configuracao dedicada."
                  values={settings.modules.default}
                  onChange={(next) => setSettings((prev) => ({ ...prev, modules: { ...prev.modules, default: next } }))}
                  defaultPrefix="shared"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-border/40 bg-card/75 shadow-sm backdrop-blur-md dark:bg-zinc-950/45">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Diagnostico efetivo
          </CardTitle>
          <CardDescription>
            Mostra a configuracao realmente resolvida pelo backend, com fallback de ambiente quando necessario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <LoadingState label="Carregando diagnostico do storage..." />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatusTile label="Status" ok={Boolean(storage?.configured)} okText="Configurado" failText="Incompleto" />
                <InfoTile label="Origem" value={storage?.source === "database" ? "Banco" : storage?.source === "env" ? "Runtime" : "Indefinida"} />
                <InfoTile label="Modo" value={storage?.mode === "public_base_url" ? "URL publica" : "URL assinada"} />
                <InfoTile label="TTL URL assinada" value={`${storage?.signedUrlTtlSeconds ?? 900}s`} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoTile label="Provider" value={storage?.provider || "Cloudflare R2"} />
                <InfoTile label="Endpoint" value={storage?.endpointHost || "N/A"} />
                <InfoTile label="Bucket efetivo" value={storage?.bucketName || "N/A"} />
                <InfoTile label="Public Base URL efetiva" value={storage?.publicBaseUrl || "Nao configurado"} />
                <StatusLine label="Access Key ID" ok={Boolean(storage?.hasAccessKeyId)} />
                <StatusLine label="Secret Access Key" ok={Boolean(storage?.hasSecretAccessKey)} />
              </div>

              {storage?.modules ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(storage.modules).map(([moduleKey, moduleValue]) => (
                    <div key={moduleKey} className="rounded-xl border border-border/60 bg-muted/15 p-4">
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{moduleKey}</div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div><span className="text-muted-foreground">Bucket:</span> {moduleValue.bucketName || "Padrao"}</div>
                        <div><span className="text-muted-foreground">Pasta:</span> {moduleValue.prefix}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className={storage?.issues?.length ? "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300" : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"}> {/* ds-allow */}
                {storage?.issues?.length ? (
                  <>
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <TriangleAlert className="h-4 w-4" />
                      Pontos de atencao
                    </div>
                    <ul className="space-y-1">
                      {storage.issues.map((issue) => (
                        <li key={issue}>- {issue}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  "Configuracao efetiva do R2 valida para uso."
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
