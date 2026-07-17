import { HardDriveDownload, Loader2, Plus, Save, Folder, Building2, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Badge } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { SearchableCompanyPicker } from "./searchable-company-picker";
import { formatDateTime, getSysproUpdateHealthMeta } from "../host-details.helpers";
import {
  COMPANY_SERVER_TYPE_LABEL,
  DEFAULT_INSTALLATION_DIRECTORY,
  REMOTE_CONNECTION_LABEL,
  UNLINKED_COMPANY_VALUE,
} from "../host-details.constants";

type InstallationContext = RemoteHostDetails["installationContexts"][number];
type HostInstallationsPanelDetails = Pick<RemoteHostDetails, "company" | "companyOptions">;
type CompanyContextDraft = {
  serverType: "SYSPRO_SERVER" | "IIS" | "__none__";
  installationDirectory: string;
  serverHost: string;
  serverPort: string;
  serverProtocol: "HTTP" | "HTTPS" | "__none__";
  iisIsapiPath: string;
  observacoes: string;
};

function normalizeInstallationPath(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/[\\/]+/g, "/").toLowerCase() : "";
}

export function resolveSysproVersionInfoForPath(
  sysproVersionSnapshot: Record<string, unknown> | null,
  installationPath: string,
) {
  const targetPath = normalizeInstallationPath(installationPath);
  if (!targetPath) return null;

  const installs = Array.isArray(sysproVersionSnapshot?.["installations"])
    ? (sysproVersionSnapshot["installations"] as Record<string, unknown>[])
    : [];

  return installs.find((inst) => normalizeInstallationPath(inst["serverPath"]) === targetPath) ?? null;
}

type HostInstallationsTabProps = {
  details: HostInstallationsPanelDetails;
  installationFilter: "all" | "unlinked";
  setInstallationFilter: (v: "all" | "unlinked") => void;
  canManageInstallations: boolean;
  bulkInstallationCompanyId: string;
  setBulkInstallationCompanyId: (v: string) => void;
  isBulkRelinkingInstallations: boolean;
  handleBulkRelinkInstallations: (id: string | null) => void;
  dedupedInstallationContexts: InstallationContext[];
  unlinkedInstallationsCount: number;
  installationContextsForDisplay: InstallationContext[];
  selectedCompanyByUpdateId: Record<string, string>;
  setSelectedCompanyByUpdateId: Dispatch<SetStateAction<Record<string, string>>>;
  isRelinkingInstallation: boolean;
  handleRelinkInstallation: (updateId: string, companyId: string | null) => void;
  manualInstallationCompanyId: string;
  setManualInstallationCompanyId: (value: string) => void;
  manualInstallationPath: string;
  setManualInstallationPath: (value: string) => void;
  isCreatingManualInstallation: boolean;
  handleCreateManualInstallation: () => void;
  handleAddCompanyToInstallation: (updateId: string, companyId: string) => void;
  sysproVersionSnapshot: Record<string, unknown> | null;
  companyContextDraftByCompanyId: Record<string, CompanyContextDraft>;
  updateCompanyContextDraft: (
    companyId: string,
    patch: Partial<CompanyContextDraft>,
    companyContext: InstallationContext["company"],
    fallbackDirectory: string,
  ) => void;
  isSavingCompanyContext: boolean;
  savingCompanyContextId: string | null;
  handleSaveCompanyContext: (
    companyId: string,
    companyContext: InstallationContext["company"],
    fallbackDirectory: string,
  ) => void;
};

export function HostInstallationsTab({
  details,
  installationFilter,
  setInstallationFilter,
  canManageInstallations,
  bulkInstallationCompanyId,
  setBulkInstallationCompanyId,
  isBulkRelinkingInstallations,
  handleBulkRelinkInstallations,
  dedupedInstallationContexts,
  unlinkedInstallationsCount,
  installationContextsForDisplay,
  selectedCompanyByUpdateId,
  setSelectedCompanyByUpdateId,
  isRelinkingInstallation,
  handleRelinkInstallation,
  handleAddCompanyToInstallation,
  sysproVersionSnapshot,
  manualInstallationCompanyId,
  setManualInstallationCompanyId,
  manualInstallationPath,
  setManualInstallationPath,
  isCreatingManualInstallation,
  handleCreateManualInstallation,
  companyContextDraftByCompanyId,
  updateCompanyContextDraft,
  isSavingCompanyContext,
  savingCompanyContextId,
  handleSaveCompanyContext,
}: HostInstallationsTabProps) {
  const [addCompanyByUpdateId, setAddCompanyByUpdateId] = useState<Record<string, string>>({});

  // Grouping the items by physical folder path
  const groupedInstallations = useMemo(() => {
    const byPath = new Map<string, {
      path: string;
      contexts: InstallationContext[];
    }>();

    for (const context of installationContextsForDisplay) {
      const normPath = context.update.path.trim().toLowerCase();
      const existing = byPath.get(normPath);
      if (existing) {
        existing.contexts.push(context);
      } else {
        byPath.set(normPath, {
          path: context.update.path.trim(),
          contexts: [context],
        });
      }
    }

    return Array.from(byPath.values());
  }, [installationContextsForDisplay]);

  return (
    <div className="space-y-6">
      {/* Manual Association Creator */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Associações de Empresa e Instalações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-muted/15 p-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Adicionar nova pasta ou associação</p>
                <p className="text-sm text-muted-foreground">
                  Defina manualmente qual empresa usa cada diretório deste host para orientar o agente e os backups.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)_auto] lg:items-end">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Diretório no Host (caminho físico)</p>
                  <Input
                    value={manualInstallationPath}
                    onChange={(event) => setManualInstallationPath(event.target.value)}
                    placeholder={DEFAULT_INSTALLATION_DIRECTORY}
                    disabled={isCreatingManualInstallation || !canManageInstallations}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Empresa associada</p>
                  <SearchableCompanyPicker
                    value={manualInstallationCompanyId}
                    options={details.companyOptions}
                    onChange={setManualInstallationCompanyId}
                    disabled={isCreatingManualInstallation || !canManageInstallations}
                  />
                </div>

                {canManageInstallations ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateManualInstallation}
                    disabled={isCreatingManualInstallation || !manualInstallationCompanyId || !manualInstallationPath.trim()}
                    className="gap-2"
                  >
                    {isCreatingManualInstallation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {isCreatingManualInstallation ? "Adicionando..." : "Adicionar associação"}
                  </Button>
                ) : null}
              </div>

              {!canManageInstallations ? (
                <p className="text-xs text-muted-foreground">Seu perfil tem acesso somente leitura para instalações.</p>
              ) : null}
            </div>
          </div>


        </CardContent>
      </Card>

      {/* Grouped Folders (Physical Installations list) */}
      {groupedInstallations.length ? (
        <div className="space-y-6">
          {groupedInstallations.map((group) => {
            const { path, contexts } = group;
            const versionInfo = resolveSysproVersionInfoForPath(sysproVersionSnapshot, path);
            const exeVersion = typeof versionInfo?.["exeVersion"] === "string" ? versionInfo["exeVersion"] : null;
            const exeExists = versionInfo?.["exeExists"] === true;
            const exeSizeMB = typeof versionInfo?.["exeSizeMB"] === "number" ? versionInfo["exeSizeMB"] : null;

            // Use data from the first update to display folder health & timestamps
            const primaryUpdate = contexts[0]?.update;
            const updateHealthMeta = primaryUpdate ? getSysproUpdateHealthMeta({
              isServerHost: primaryUpdate.isServerHost,
              lastFileWriteAt: primaryUpdate.lastFileWriteAt,
            }) : null;

            return (
              <Card key={path} className="border-border/50 bg-background/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6 flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                      <span className="font-mono text-sm break-all">{path}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pasta física mapeada/cadastrada no servidor do cliente.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Exe Version info badge */}
                    {exeExists ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] border-emerald-500/20 py-1">
                        v{exeVersion ?? "Não lida"} {exeSizeMB ? `(${formatNumber(exeSizeMB, { maximumFractionDigits: 1 })} MB)` : ""}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[11px] py-1 border-border">
                        Sem executável
                      </Badge>
                    )}
                    
                    {updateHealthMeta && (
                      <Badge variant="outline" className={cn("text-[11px] py-1 border-current", updateHealthMeta.className)}>
                        {updateHealthMeta.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Telemetry metadata row */}
                  {primaryUpdate && (
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 text-xs text-muted-foreground bg-muted/10 p-3 rounded-lg">
                      <div>
                        <span className="font-medium text-muted-foreground/80 block">Última Escrita no Disco</span>
                        <span className="text-foreground">{formatDateTime(primaryUpdate.lastFileWriteAt)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground/80 block">Último Batimento</span>
                        <span className="text-foreground">{formatDateTime(primaryUpdate.lastHeartbeatAt)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground/80 block">Servidor de Execução</span>
                        <span className="text-foreground">{primaryUpdate.isServerHost ? "Sim" : "Não"}</span>
                      </div>
                    </div>
                  )}

                  {/* Linked Companies Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>Empresas Vinculadas a esta Pasta</span>
                    </h4>

                    <div className="space-y-4">
                      {contexts.map((context) => {
                        const entry = context.update;
                        const companyContext = context.company;
                        const companyName = companyContext?.nomeFantasia ?? companyContext?.razaoSocial ?? "Sem empresa vinculada";
                        const serverType = companyContext?.serverType
                          ? COMPANY_SERVER_TYPE_LABEL[companyContext.serverType as keyof typeof COMPANY_SERVER_TYPE_LABEL]
                          : "Não configurado";
                        const draft = entry.companyId ? companyContextDraftByCompanyId[entry.companyId] : undefined;

                        return (
                          <div key={entry.id} className="border border-border/40 rounded-xl bg-background/30 p-4 space-y-4">
                            {/* Company Card Header */}
                            <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border/30 pb-3">
                              <div>
                                <p className="font-medium text-sm text-foreground">{companyName}</p>
                                {!entry.companyId ? (
                                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                                    Instalação sem vínculo formal com empresa do cadastro.
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Tipo de Servidor: <strong className="text-foreground/80">{serverType}</strong>
                                  </p>
                                )}
                              </div>

                              {/* Link/Unlink company fields */}
                              {canManageInstallations && (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={selectedCompanyByUpdateId[entry.id] ?? (entry.companyId ?? UNLINKED_COMPANY_VALUE)}
                                    onValueChange={(val) => setSelectedCompanyByUpdateId(prev => ({ ...prev, [entry.id]: val }))}
                                    disabled={isRelinkingInstallation}
                                  >
                                    <SelectTrigger className="h-8 text-xs max-w-[200px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={UNLINKED_COMPANY_VALUE}>Sem Vínculo</SelectItem>
                                      {details.companyOptions.map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={isRelinkingInstallation}
                                    onClick={() => {
                                      const sel = selectedCompanyByUpdateId[entry.id] ?? (entry.companyId ?? UNLINKED_COMPANY_VALUE);
                                      handleRelinkInstallation(entry.id, sel === UNLINKED_COMPANY_VALUE ? null : sel);
                                    }}
                                  >
                                    Aplicar
                                  </Button>
                                  {entry.companyId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs text-red-500 hover:text-red-600"
                                      disabled={isRelinkingInstallation}
                                      onClick={() => handleRelinkInstallation(entry.id, null)}
                                    >
                                      Desvincular
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Technical context inputs if company linked */}
                            {entry.companyId ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold text-foreground/80">Contexto Técnico da Empresa</p>
                                  {canManageInstallations && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1.5"
                                      disabled={isSavingCompanyContext && savingCompanyContextId === entry.companyId}
                                      onClick={() => handleSaveCompanyContext(entry.companyId!, companyContext, path)}
                                    >
                                      {isSavingCompanyContext && savingCompanyContextId === entry.companyId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Save className="h-3 w-3" />
                                      )}
                                      Salvar Contexto
                                    </Button>
                                  )}
                                </div>

                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground/85">Tipo Técnico</span>
                                    <Select
                                      value={draft?.serverType ?? (companyContext?.serverType ?? "__none__")}
                                      onValueChange={(val: "SYSPRO_SERVER" | "IIS" | "__none__") =>
                                        updateCompanyContextDraft(entry.companyId!, { serverType: val }, companyContext, path)
                                      }
                                      disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                    >
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Não definido</SelectItem>
                                        {Object.entries(COMPANY_SERVER_TYPE_LABEL).map(([val, label]) => (
                                          <SelectItem key={val} value={val}>{label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground/85">Servidor</span>
                                    <Input
                                      value={draft?.serverHost ?? (companyContext?.serverHost ?? "")}
                                      onChange={(ev) => updateCompanyContextDraft(entry.companyId!, { serverHost: ev.target.value }, companyContext, path)}
                                      placeholder="localhost"
                                      className="h-9 text-xs"
                                      disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground/85">Porta</span>
                                    <Input
                                      value={draft?.serverPort ?? (companyContext?.serverPort ? String(companyContext.serverPort) : "")}
                                      onChange={(ev) => updateCompanyContextDraft(entry.companyId!, { serverPort: ev.target.value }, companyContext, path)}
                                      placeholder="8080"
                                      className="h-9 text-xs"
                                      disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground/85">Protocolo</span>
                                    <Select
                                      value={draft?.serverProtocol ?? (companyContext?.serverProtocol ?? "__none__")}
                                      onValueChange={(val: "HTTP" | "HTTPS" | "__none__") =>
                                        updateCompanyContextDraft(entry.companyId!, { serverProtocol: val }, companyContext, path)
                                      }
                                      disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                    >
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Não definido</SelectItem>
                                        <SelectItem value="HTTP">HTTP</SelectItem>
                                        <SelectItem value="HTTPS">HTTPS</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1 sm:col-span-2">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground/85">ISAPI / dll path</span>
                                    <Input
                                      value={draft?.iisIsapiPath ?? (companyContext?.iisIsapiPath ?? "")}
                                      onChange={(ev) => updateCompanyContextDraft(entry.companyId!, { iisIsapiPath: ev.target.value }, companyContext, path)}
                                      placeholder="/isapi/syspro.dll"
                                      className="h-9 text-xs"
                                      disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                    />
                                  </div>

                                  <div className="space-y-1 sm:col-span-2">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground/85">Diretório de Configuração</span>
                                    <Input
                                      value={draft?.installationDirectory ?? (companyContext?.installationDirectory ?? path)}
                                      onChange={(ev) => updateCompanyContextDraft(entry.companyId!, { installationDirectory: ev.target.value }, companyContext, path)}
                                      placeholder={path}
                                      className="h-9 text-xs"
                                      disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-medium text-muted-foreground/85">Observações</span>
                                  <Textarea
                                    value={draft?.observacoes ?? (companyContext?.observacoes ?? "")}
                                    onChange={(ev) => updateCompanyContextDraft(entry.companyId!, { observacoes: ev.target.value }, companyContext, path)}
                                    placeholder="Observações de rede ou infraestrutura para esta empresa..."
                                    className="min-h-16 text-xs"
                                    disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg p-3 bg-muted/5">
                                Vincule uma empresa a este registro para liberar a configuração do contexto técnico da mesma.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add company helper inside this physical folder card */}
                  {canManageInstallations && primaryUpdate && (
                    <div className="border-t border-border/30 pt-4 space-y-2">
                      <p className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wider">
                        Vincular Outra Empresa a esta Pasta Física
                      </p>
                      <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                        <div className="flex-1 min-w-[200px]">
                          <SearchableCompanyPicker
                            value={addCompanyByUpdateId[primaryUpdate.id] ?? ""}
                            options={details.companyOptions.filter(
                              (opt) => !contexts.some(c => c.update.companyId === opt.id) && opt.id !== UNLINKED_COMPANY_VALUE
                            )}
                            onChange={(val) => setAddCompanyByUpdateId(prev => ({ ...prev, [primaryUpdate.id]: val }))}
                            disabled={isRelinkingInstallation}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9"
                          disabled={isRelinkingInstallation || !addCompanyByUpdateId[primaryUpdate.id]}
                          onClick={() => {
                            const cid = addCompanyByUpdateId[primaryUpdate.id];
                            if (cid) {
                              handleAddCompanyToInstallation(primaryUpdate.id, cid);
                              setAddCompanyByUpdateId(prev => ({ ...prev, [primaryUpdate.id]: "" }));
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Vincular Empresa
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {installationFilter === "unlinked"
              ? "Nenhuma instalação sem vínculo encontrada para o filtro atual."
              : "Nenhuma instalação cadastrada ainda. Use o cadastro manual acima ou aguarde o próximo inventário do agente."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
