"use client";

import { useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Copy, KeyRound, Link2, Loader2, MonitorCog, RefreshCw, Save, TimerReset, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  remoteModuleSettingsSchema,
} from "@dosc-syspro/contracts/remote";
import {
  getRemoteModuleSettingsAction,
  updateRemoteModuleSettingsAction,
} from "@/features/remote/application/module-settings-actions";
import type { RemoteModuleSettings } from "@/features/remote/domain/model";
import { getRemoteApiErrorMessage, requestRemoteMutation, requestRemoteQuery } from "@/features/remote/interface/remote-api";

type RemoteModuleSettingsFormValues = z.input<typeof remoteModuleSettingsSchema>;
type CompanyOption = { id: string; label: string };
type AddressBookCredentialItem = {
  id: string;
  label: string;
  integrationKey: string;
  scope: "GLOBAL" | "COMPANY";
  status: "ACTIVE" | "REVOKED";
  companyId: string | null;
  companyName: string | null;
  tokenPreview: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; email: string } | null;
  rotatedBy?: { id: string; name: string | null; email: string } | null;
  revokedBy?: { id: string; name: string | null; email: string } | null;
};

type RemoteClientProfile = {
  contractVersion: string;
  profile: {
    serverIdRelay: string;
    serverApi: string;
    key: string;
    serverConfig: string;
    targetVersion: string;
    defaultPassword: string;
  };
  commands: {
    bootstrapEndpoint: string;
    syncEndpoint: string;
    ackEndpoint: string;
  };
  notes: string[];
};

type CredentialDraft = {
  label: string;
  integrationKey: string;
  scope: "GLOBAL" | "COMPANY";
  companyId: string;
  expiresDays: string;
};

const defaultValues: RemoteModuleSettings = {
  rustDeskServerHost: "acesso.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey: "",
  rustDeskVersion: "1.4.6",
  heartbeatIntervalMinutes: 5,
  defaultPassword: "Trilink098",
};

function buildCredentialInitial(firstCompanyId: string): CredentialDraft {
  return {
    label: "",
    integrationKey: "",
    scope: "GLOBAL",
    companyId: firstCompanyId,
    expiresDays: "",
  };
}

function useCredentials() {
  const [credentials, setCredentials] = useState<AddressBookCredentialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    try {
      setIsLoading(true);
      const result = await requestRemoteQuery<AddressBookCredentialItem[]>({
        url: "/api/remote/rustdesk/address-book/credentials",
        method: "GET",
      });
      const items = Array.isArray(result.data) ? result.data : [];
      setCredentials(items);
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { credentials, isLoading, refresh };
}

export function RemoteModuleSettingsForm({ companyOptions }: { companyOptions: CompanyOption[] }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const { credentials, isLoading: credentialsLoading, refresh: loadCredentials } = useCredentials();
  const [isSubmittingCredential, startSubmittingCredential] = useTransition();
  const [credentialDraft, setCredentialDraft] = useReducer(
    (state: CredentialDraft, patch: Partial<CredentialDraft>) => ({ ...state, ...patch }),
    buildCredentialInitial(companyOptions[0]?.id ?? "")
  );
  const [credentialStatusFilter, setCredentialStatusFilter] = useState<"ALL" | "ACTIVE" | "REVOKED">("ALL");
  const [credentialScopeFilter, setCredentialScopeFilter] = useState<"ALL" | "GLOBAL" | "COMPANY">("ALL");
  const [credentialQuery, setCredentialQuery] = useState("");
  const [latestIssuedToken, setLatestIssuedToken] = useState<{ token: string; preview: string } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [clientProfile, setClientProfile] = useState<RemoteClientProfile | null>(null);
  const [clientProfileLoading, setClientProfileLoading] = useState(true);

  const form = useForm<RemoteModuleSettingsFormValues>({
    resolver: zodResolver(remoteModuleSettingsSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await getRemoteModuleSettingsAction();
        if (!isMounted) return;

        if (result.success) {
          form.reset(result.data);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Erro ao carregar configuracoes do Agente Trilink.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [form]);

  useEffect(() => {
    if (!credentialDraft.companyId && companyOptions[0]?.id) {
      setCredentialDraft({ companyId: companyOptions[0].id });
    }
  }, [companyOptions, credentialDraft.companyId]);

  useEffect(() => {
    let mounted = true;

    async function loadClientProfile() {
      try {
        setClientProfileLoading(true);
        const result = await requestRemoteQuery<RemoteClientProfile>({
          url: "/api/remote/rustdesk/client-profile",
          method: "GET",
        });
        if (!mounted) return;
        setClientProfile(result.data ?? null);
      } catch (error) {
        if (!mounted) return;
        toast.error(getRemoteApiErrorMessage(error));
      } finally {
        if (mounted) setClientProfileLoading(false);
      }
    }

    loadClientProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedCredentials = useMemo(() => {
    const normalizedQuery = credentialQuery.trim().toLowerCase();
    return [...credentials]
      .filter((item) => {
        if (credentialStatusFilter !== "ALL" && item.status !== credentialStatusFilter) return false;
        if (credentialScopeFilter !== "ALL" && item.scope !== credentialScopeFilter) return false;
        if (!normalizedQuery) return true;
        const searchText = [
          item.label,
          item.integrationKey,
          item.tokenPreview,
          item.companyName ?? "",
          item.createdBy?.name ?? "",
          item.createdBy?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return searchText.includes(normalizedQuery);
      })
      .sort((a, b) => {
      if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [credentials, credentialQuery, credentialScopeFilter, credentialStatusFilter]);

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
      return true;
    } catch {
      toast.error(`Falha ao copiar ${label.toLowerCase()}.`);
      return false;
    }
  }

  function resetCredentialForm() {
    setCredentialDraft(buildCredentialInitial(companyOptions[0]?.id ?? ""));
  }

  function normalizeIntegrationKey(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
  }

  async function handleCreateCredential() {
    if (!credentialDraft.label.trim()) {
      toast.error("Informe o nome da credencial.");
      return;
    }
    if (credentialDraft.scope === "COMPANY" && !credentialDraft.companyId) {
      toast.error("Selecione a empresa da credencial.");
      return;
    }

    startSubmittingCredential(async () => {
      try {
        const result = await requestRemoteMutation<{ token?: string; tokenPreview?: string }>({
          url: "/api/remote/rustdesk/address-book/credentials",
          method: "POST",
          body: {
            label: credentialDraft.label.trim(),
            integrationKey: normalizeIntegrationKey(credentialDraft.integrationKey || credentialDraft.label),
            scope: credentialDraft.scope,
            companyId: credentialDraft.scope === "COMPANY" ? credentialDraft.companyId : null,
            expiresInDays: credentialDraft.expiresDays ? Number(credentialDraft.expiresDays) : null,
          },
        });
        toast.success(result.message ?? "Credencial criada.");
        setLatestIssuedToken({
          token: result.data?.token ?? "",
          preview: result.data?.tokenPreview ?? "",
        });
        setTokenCopied(false);
        resetCredentialForm();
        await loadCredentials();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  async function handleRotateCredential(id: string) {
    startSubmittingCredential(async () => {
      try {
        const result = await requestRemoteMutation<{ token?: string; tokenPreview?: string }>({
          url: `/api/remote/rustdesk/address-book/credentials/${id}/rotate`,
          method: "POST",
        });
        toast.success(result.message ?? "Credencial rotacionada.");
        setLatestIssuedToken({
          token: result.data?.token ?? "",
          preview: result.data?.tokenPreview ?? "",
        });
        await loadCredentials();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  async function handleRevokeCredential(id: string) {
    startSubmittingCredential(async () => {
      try {
        const result = await requestRemoteMutation({
          url: `/api/remote/rustdesk/address-book/credentials/${id}/revoke`,
          method: "POST",
        });
        toast.success(result.message ?? "Credencial revogada.");
        await loadCredentials();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function formatDateTime(value: string | null) {
    if (!value) return "Sem registro";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sem registro";
    return date.toLocaleString("pt-BR");
  }

  function resolveExpiryBadge(credential: AddressBookCredentialItem) {
    if (!credential.expiresAt) {
      return { label: "Sem expiracao", className: "border-border/60 bg-background/70 text-foreground" };
    }
    const expires = new Date(credential.expiresAt);
    const now = new Date();
    if (expires.getTime() <= now.getTime()) {
      return { label: "Expirada", className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300" };
    }
    const hoursLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursLeft <= 48) {
      return { label: "Expira em breve", className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" };
    }
    return { label: "Valida", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
  }

  const onSubmit: SubmitHandler<RemoteModuleSettingsFormValues> = async (data) => {
    startTransition(async () => {
      try {
        const parsed = remoteModuleSettingsSchema.parse(data);
        const result = await updateRemoteModuleSettingsAction(parsed);
        if (result.success) {
          toast.success(result.message);
          form.reset(parsed);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Erro ao salvar configuracoes. Verifique os campos e tente novamente.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando configuracoes do Agente Trilink...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <MonitorCog className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Servidor RustDesk</CardTitle>
              <CardDescription>
                Estes valores alimentam o perfil oficial do cliente RustDesk e os endpoints autenticados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rustDeskServerHost">Host do servidor</Label>
            <Input id="rustDeskServerHost" placeholder="acesso.trilinksoftware.com.br" {...form.register("rustDeskServerHost")} />
            <p className="text-xs text-muted-foreground">Usado como `custom-rendezvous-server` no onboarding do agente.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rustDeskPublicKey">Chave publica</Label>
            <Input id="rustDeskPublicKey" placeholder="Cole a chave publica do seu servidor RustDesk" {...form.register("rustDeskPublicKey")} />
            <p className="text-xs text-muted-foreground">Opcional. Quando preenchida, o agente aplica `--option key` na instalacao.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="rustDeskServerConfig">Configuracao exportada</Label>
            <Textarea
              id="rustDeskServerConfig"
              rows={5}
              placeholder="Cole aqui a string exportada do RustDesk self-hosted"
              {...form.register("rustDeskServerConfig")}
            />
            <p className="text-xs text-muted-foreground">Essa string e aplicada no cliente para alinhar o acesso ao seu servidor proprio.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <TimerReset className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Politicas do agente</CardTitle>
              <CardDescription>
                Defaults operacionais aplicados no bootstrap, sync recorrente e convergencia do agente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="rustDeskVersion">Versao alvo</Label>
            <Input id="rustDeskVersion" placeholder="1.4.6" {...form.register("rustDeskVersion")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heartbeatIntervalMinutes">Heartbeat (minutos)</Label>
            <Input
              id="heartbeatIntervalMinutes"
              type="number"
              min={1}
              max={120}
              {...form.register("heartbeatIntervalMinutes", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPassword">Senha padrao</Label>
            <Input id="defaultPassword" {...form.register("defaultPassword")} />
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground md:col-span-3">
            Esses parametros impactam diretamente o Card de Saude do Agente em `Detalhes` do host, incluindo status atual,
            estado de auto-cura e convergencia do cliente.
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Perfil para cliente customizado</CardTitle>
              <CardDescription>
                Dados oficiais para cliente RustDesk customizado, com servidor proprio e integracao direta com `bootstrap/sync/ack`.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientProfileLoading ? (
            <p className="text-sm text-muted-foreground">Carregando perfil de cliente...</p>
          ) : clientProfile ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                  {clientProfile.contractVersion}
                </Badge>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  Servidor: {clientProfile.profile.serverIdRelay || "nao configurado"}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Servidor ID/Relay</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">{clientProfile.profile.serverIdRelay || "Nao configurado"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Servidor da API</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">{clientProfile.profile.serverApi || "Nao configurado"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Key publica</p>
                  <p className="mt-1 break-all text-xs font-mono text-foreground">{clientProfile.profile.key || "Nao configurado"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Versao alvo</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{clientProfile.profile.targetVersion || "Nao configurado"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Endpoints operacionais</p>
                <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Bootstrap:</span> {clientProfile.commands.bootstrapEndpoint}</p>
                  <p><span className="font-medium text-foreground">Sync:</span> {clientProfile.commands.syncEndpoint}</p>
                  <p><span className="font-medium text-foreground">Ack:</span> {clientProfile.commands.ackEndpoint}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => copyText(clientProfile.profile.serverIdRelay, "Servidor ID/Relay")} disabled={!clientProfile.profile.serverIdRelay}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copiar servidor
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => copyText(clientProfile.profile.key, "Key publica")} disabled={!clientProfile.profile.key}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copiar key
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => copyText(clientProfile.profile.serverConfig, "Configuracao exportada")} disabled={!clientProfile.profile.serverConfig}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copiar serverConfig
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Perfil do cliente indisponivel.</p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Segredo de descoberta</p>
            <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-200/80">
              O `REMOTE_DISCOVERY_TOKEN` continua vindo do ambiente. Esta tela controla apenas a governanca global do RustDesk dentro do Agente Trilink.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Credenciais do Address Book</CardTitle>
              <CardDescription>
                Operacao de credenciais autenticadas para consumo do endpoint `/api/remote/rustdesk/address-book`.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestIssuedToken?.token && !tokenCopied ? (
            <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Copie o token agora ({latestIssuedToken.preview}) - ele nao sera exibido novamente.
                  </p>
                  <p className="mt-2 break-all rounded-md bg-amber-500/10 p-2 font-mono text-xs text-amber-800 dark:text-amber-100">
                    {latestIssuedToken.token}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const copied = await copyText(latestIssuedToken.token, "Token");
                        if (copied) setTokenCopied(true);
                      }}
                      className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar e dispensar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTokenCopied(true)}
                      className="text-amber-700 hover:text-amber-800 dark:text-amber-200 dark:hover:text-amber-100"
                    >
                      Dispensar sem copiar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da credencial</Label>
              <Input
                value={credentialDraft.label}
                onChange={(event) => setCredentialDraft({ label: event.target.value })}
                placeholder="Address Book - Operacao"
              />
            </div>
            <div className="space-y-2">
              <Label>Integration key</Label>
              <Input
                value={credentialDraft.integrationKey}
                onChange={(event) => setCredentialDraft({ integrationKey: event.target.value })}
                placeholder="address-book-operacao"
              />
              {(credentialDraft.integrationKey || credentialDraft.label) ? (
                <p className="text-xs text-muted-foreground">
                  Chave normalizada:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                    {normalizeIntegrationKey(credentialDraft.integrationKey || credentialDraft.label)}
                  </code>
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select
                value={credentialDraft.scope}
                onValueChange={(value) => setCredentialDraft({ scope: value as "GLOBAL" | "COMPANY" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">GLOBAL</SelectItem>
                  <SelectItem value="COMPANY">COMPANY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expira em (dias)</Label>
              <Input
                type="number"
                min={1}
                value={credentialDraft.expiresDays}
                onChange={(event) => setCredentialDraft({ expiresDays: event.target.value })}
                placeholder="Sem expiracao"
              />
            </div>
            {credentialDraft.scope === "COMPANY" ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Empresa</Label>
                <Select value={credentialDraft.companyId} onValueChange={(value) => setCredentialDraft({ companyId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={handleCreateCredential} disabled={isSubmittingCredential}>
              Criar credencial
            </Button>
            <Button type="button" variant="outline" onClick={() => loadCredentials()} disabled={credentialsLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar lista
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={credentialStatusFilter} onValueChange={(value) => setCredentialStatusFilter(value as "ALL" | "ACTIVE" | "REVOKED")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Ativas</SelectItem>
                  <SelectItem value="REVOKED">Revogadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select value={credentialScopeFilter} onValueChange={(value) => setCredentialScopeFilter(value as "ALL" | "GLOBAL" | "COMPANY")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="GLOBAL">GLOBAL</SelectItem>
                  <SelectItem value="COMPANY">COMPANY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Busca</Label>
              <Input
                value={credentialQuery}
                onChange={(event) => setCredentialQuery(event.target.value)}
                placeholder="Label, integration key, empresa..."
              />
            </div>
          </div>

          <div className="space-y-2">
            {credentialsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando credenciais...</p>
            ) : sortedCredentials.length ? (
              sortedCredentials.map((credential) => {
                const expiryBadge = resolveExpiryBadge(credential);
                const createdByLabel = credential.createdBy?.name ?? credential.createdBy?.email ?? "Sem registro";
                const revokedByLabel = credential.revokedBy?.name ?? credential.revokedBy?.email ?? "Sem registro";

                return (
                  <div key={credential.id} className="rounded-lg border border-border/50 bg-muted/10 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {credential.label} ({credential.tokenPreview})
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              credential.status === "ACTIVE"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-border/60 bg-background/70 text-muted-foreground"
                            }
                          >
                            {credential.status}
                          </Badge>
                          <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                            {credential.scope}
                          </Badge>
                          <Badge variant="outline" className={expiryBadge.className}>
                            {expiryBadge.label}
                          </Badge>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
                          <div>
                            <dt className="text-muted-foreground">Integration key</dt>
                            <dd className="break-all font-mono text-foreground">{credential.integrationKey}</dd>
                          </div>
                          {credential.companyName ? (
                            <div>
                              <dt className="text-muted-foreground">Empresa</dt>
                              <dd className="text-foreground">{credential.companyName}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="text-muted-foreground">Ultimo uso</dt>
                            <dd className="text-foreground">{formatDateTime(credential.lastUsedAt)}</dd>
                          </div>
                          {credential.expiresAt ? (
                            <div>
                              <dt className="text-muted-foreground">Expira em</dt>
                              <dd className="text-foreground">{formatDateTime(credential.expiresAt)}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="text-muted-foreground">Criado por</dt>
                            <dd className="text-foreground">{createdByLabel}</dd>
                          </div>
                          {credential.status === "REVOKED" ? (
                            <div>
                              <dt className="text-muted-foreground">Revogado por</dt>
                              <dd className="text-foreground">{revokedByLabel}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => copyText(credential.integrationKey, "Integration key")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar key
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={isSubmittingCredential || credential.status !== "ACTIVE"}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Rotacionar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rotacionar credencial?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A credencial <strong>{credential.label}</strong> tera o token atual invalidado imediatamente
                                e um novo token sera emitido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRotateCredential(credential.id)}>
                                Confirmar rotacao
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={isSubmittingCredential || credential.status !== "ACTIVE"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Revogar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revogar credencial?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A credencial <strong>{credential.label}</strong> sera revogada permanentemente e as integracoes
                                que usam esse token vao falhar ate nova emissao.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevokeCredential(credential.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Revogar permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              credentials.length > 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 p-6 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma credencial corresponde aos filtros ativos.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setCredentialStatusFilter("ALL");
                      setCredentialScopeFilter("ALL");
                      setCredentialQuery("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma credencial cadastrada ainda. Use o formulario acima para criar a primeira.
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-6">
        <Button type="submit" size="lg" disabled={isSaving || !form.formState.isDirty} className="min-w-[190px]">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar configuracoes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
