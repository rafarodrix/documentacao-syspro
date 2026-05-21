import { HardDriveDownload, Loader2, Plus, Save } from "lucide-react";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@dosc-syspro/ui";
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
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Associações de empresa e instalações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-muted/15 p-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Adicionar associação</p>
                <p className="text-sm text-muted-foreground">
                  Defina manualmente qual empresa usa cada instalação deste host e qual diretório deve orientar o agente.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)_auto] lg:items-end">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diretório monitorado</p>
                  <Input
                    value={manualInstallationPath}
                    onChange={(event) => setManualInstallationPath(event.target.value)}
                    placeholder={DEFAULT_INSTALLATION_DIRECTORY}
                    disabled={isCreatingManualInstallation || !canManageInstallations}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa da instalação</p>
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

          <div className="rounded-2xl border border-border/50 bg-muted/15 p-5">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Associações existentes</p>
              <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto] lg:items-end">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Filtro</p>
                  <Select value={installationFilter} onValueChange={(value: "all" | "unlinked") => setInstallationFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as instalações</SelectItem>
                      <SelectItem value="unlinked">Somente sem vínculo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {canManageInstallations ? (
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Empresa para associações filtradas
                    </p>
                    <SearchableCompanyPicker
                      value={bulkInstallationCompanyId || UNLINKED_COMPANY_VALUE}
                      options={details.companyOptions}
                      onChange={(next) => setBulkInstallationCompanyId(next === UNLINKED_COMPANY_VALUE ? "" : next)}
                      disabled={isBulkRelinkingInstallations || !details.companyOptions.length}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground lg:pb-2">
                    Seu perfil tem acesso somente leitura para vinculação de instalações.
                  </p>
                )}

                {canManageInstallations ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBulkRelinkingInstallations || !bulkInstallationCompanyId || !installationContextsForDisplay.length}
                    onClick={() => handleBulkRelinkInstallations(bulkInstallationCompanyId)}
                  >
                    Aplicar associação nas filtradas
                  </Button>
                ) : null}

                {canManageInstallations ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBulkRelinkingInstallations || !installationContextsForDisplay.length}
                    onClick={() => handleBulkRelinkInstallations(null)}
                  >
                    Limpar vínculos filtrados
                  </Button>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">
                {installationFilter === "unlinked"
                  ? `${installationContextsForDisplay.length} instalação(ões) sem vínculo exibida(s).`
                  : `${dedupedInstallationContexts.length} instalação(ões) disponível(is), ${unlinkedInstallationsCount} sem vínculo.`}
              </p>
            </div>
          </div>

          {installationContextsForDisplay.length ? (
            <div className="space-y-4">
              {installationContextsForDisplay.map((context, index) => {
                const entry = context.update;
                const companyContext = context.company;
                const primaryCompanyDirectory =
                  details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
                const companyName =
                  companyContext?.nomeFantasia ?? companyContext?.razaoSocial ?? "Sem empresa vinculada";
                const companyDirectory = companyContext?.installationDirectory?.trim();
                const installationDirectory = companyContext
                  ? companyDirectory || primaryCompanyDirectory || DEFAULT_INSTALLATION_DIRECTORY
                  : entry.path?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
                const serverType = companyContext?.serverType
                  ? COMPANY_SERVER_TYPE_LABEL[companyContext.serverType as keyof typeof COMPANY_SERVER_TYPE_LABEL]
                  : "Não configurado";
                const draft = entry.companyId ? companyContextDraftByCompanyId[entry.companyId] : undefined;
                const updateHealthMeta = getSysproUpdateHealthMeta({
                  isServerHost: entry.isServerHost,
                  lastFileWriteAt: entry.lastFileWriteAt,
                });

                return (
                  <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <HardDriveDownload className="h-4 w-4 text-muted-foreground" />
                      Instalação {index + 1}
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{companyName}</p>
                        {!entry.companyId ? (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                            Instalação sem vínculo formal com empresa do cadastro.
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo técnico</p>
                        <p className="mt-1 text-sm text-foreground">{serverType}</p>
                      </div>

                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diretório monitorado</p>
                        <p className="mt-1 break-all font-mono text-xs text-foreground">{installationDirectory}</p>
                      </div>
                    </div>

                    {entry.companyId ? (
                      <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Contexto técnico da empresa</p>
                            <p className="text-xs text-muted-foreground">
                              Diretório, servidor e parâmetros que orientam o agente e futuros módulos como backup.
                            </p>
                          </div>

                          {canManageInstallations ? (
                            <Button
                              size="sm"
                              className="gap-2"
                              disabled={isSavingCompanyContext && savingCompanyContextId === entry.companyId}
                              onClick={() => handleSaveCompanyContext(entry.companyId!, companyContext, installationDirectory)}
                            >
                              {isSavingCompanyContext && savingCompanyContextId === entry.companyId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Salvar contexto
                            </Button>
                          ) : null}
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo técnico</p>
                            <Select
                              value={draft?.serverType ?? (companyContext?.serverType ?? "__none__")}
                              onValueChange={(value: "SYSPRO_SERVER" | "IIS" | "__none__") =>
                                updateCompanyContextDraft(entry.companyId!, { serverType: value }, companyContext, installationDirectory)
                              }
                              disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Não definido</SelectItem>
                                {Object.entries(COMPANY_SERVER_TYPE_LABEL).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 xl:col-span-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diretório</p>
                            <Input
                              value={draft?.installationDirectory ?? installationDirectory}
                              onChange={(event) =>
                                updateCompanyContextDraft(
                                  entry.companyId!,
                                  { installationDirectory: event.target.value },
                                  companyContext,
                                  installationDirectory,
                                )
                              }
                              disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servidor</p>
                            <Input
                              value={draft?.serverHost ?? (companyContext?.serverHost ?? "")}
                              onChange={(event) =>
                                updateCompanyContextDraft(
                                  entry.companyId!,
                                  { serverHost: event.target.value },
                                  companyContext,
                                  installationDirectory,
                                )
                              }
                              placeholder="localhost"
                              disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Porta</p>
                            <Input
                              value={draft?.serverPort ?? (companyContext?.serverPort ? String(companyContext.serverPort) : "")}
                              onChange={(event) =>
                                updateCompanyContextDraft(
                                  entry.companyId!,
                                  { serverPort: event.target.value },
                                  companyContext,
                                  installationDirectory,
                                )
                              }
                              placeholder="8080"
                              disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Protocolo</p>
                            <Select
                              value={draft?.serverProtocol ?? (companyContext?.serverProtocol ?? "__none__")}
                              onValueChange={(value: "HTTP" | "HTTPS" | "__none__") =>
                                updateCompanyContextDraft(entry.companyId!, { serverProtocol: value }, companyContext, installationDirectory)
                              }
                              disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Não definido</SelectItem>
                                <SelectItem value="HTTP">HTTP</SelectItem>
                                <SelectItem value="HTTPS">HTTPS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ISAPI / path</p>
                            <Input
                              value={draft?.iisIsapiPath ?? (companyContext?.iisIsapiPath ?? "")}
                              onChange={(event) =>
                                updateCompanyContextDraft(
                                  entry.companyId!,
                                  { iisIsapiPath: event.target.value },
                                  companyContext,
                                  installationDirectory,
                                )
                              }
                              placeholder="/isapi/syspro.dll"
                              disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                            />
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Observações</p>
                          <Textarea
                            value={draft?.observacoes ?? (companyContext?.observacoes ?? "")}
                            onChange={(event) =>
                              updateCompanyContextDraft(
                                entry.companyId!,
                                { observacoes: event.target.value },
                                companyContext,
                                installationDirectory,
                              )
                            }
                            placeholder="Observações operacionais para esta empresa."
                            className="min-h-24"
                            disabled={!canManageInstallations || (isSavingCompanyContext && savingCompanyContextId === entry.companyId)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-border/50 bg-background/30 p-3 text-sm text-muted-foreground">
                        Vincule primeiro a empresa desta instalação para liberar o contexto técnico.
                      </div>
                    )}

                    <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">Conexão remota</summary>
                      <div className="mt-3 space-y-3">
                        {entry.companyId && companyContext?.remoteConnections.length ? (
                          companyContext.remoteConnections.map((connection, connectionIndex: number) => (
                            <div
                              key={`${connection.type}-${connectionIndex}`}
                              className="rounded-lg border border-border/40 bg-background/40 p-3"
                            >
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</p>
                              <p className="mt-1 text-sm font-medium text-foreground">
                                {REMOTE_CONNECTION_LABEL[connection.type as keyof typeof REMOTE_CONNECTION_LABEL]}
                              </p>
                              <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                Nome/IP/identificação
                              </p>
                              <p className="mt-1 break-all text-sm text-foreground">
                                {connection.details || "Sem detalhe informado"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-3">
                            {entry.companyId
                              ? "Nenhuma conexão remota cadastrada para esta empresa."
                              : "Sem vínculo com empresa do cadastro para exibir conexões remotas."}
                          </div>
                        )}
                      </div>
                    </details>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Última atualização</p>
                        <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastFileWriteAt)}</p>
                      </div>
                      <div className={cn("rounded-lg border p-3", updateHealthMeta.className)}>
                        <p className="text-[11px] uppercase tracking-wide opacity-80">Saúde de atualização</p>
                        <p className="mt-1 text-sm font-medium">{updateHealthMeta.label}</p>
                        <p className="mt-1 text-xs opacity-90">{updateHealthMeta.detail}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Último heartbeat</p>
                        <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastHeartbeatAt)}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa vinculada</p>
                        <p className="mt-1 text-sm text-foreground">{entry.companyId ? "Vinculada" : "Sem vínculo"}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border/40 bg-background/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa desta instalação</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ajuste aqui a associação quando o mesmo host atender mais de uma empresa.
                      </p>
                      {canManageInstallations ? (
                        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                          <SearchableCompanyPicker
                            value={selectedCompanyByUpdateId[entry.id] ?? (entry.companyId ?? UNLINKED_COMPANY_VALUE)}
                            onChange={(value) =>
                              setSelectedCompanyByUpdateId((prev) => ({
                                ...prev,
                                [entry.id]: value,
                              }))
                            }
                            options={details.companyOptions}
                            disabled={isRelinkingInstallation}
                          />
                          <Button
                            size="sm"
                            disabled={isRelinkingInstallation}
                            onClick={() => {
                              const selected = selectedCompanyByUpdateId[entry.id] ?? (entry.companyId ?? UNLINKED_COMPANY_VALUE);
                              handleRelinkInstallation(entry.id, selected === UNLINKED_COMPANY_VALUE ? null : selected);
                            }}
                          >
                            Aplicar vínculo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRelinkingInstallation || !entry.companyId}
                            onClick={() => {
                              setSelectedCompanyByUpdateId((prev) => ({
                                ...prev,
                                [entry.id]: UNLINKED_COMPANY_VALUE,
                              }));
                              handleRelinkInstallation(entry.id, null);
                            }}
                          >
                            Limpar vínculo
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Seu perfil tem acesso somente leitura para vinculação de instalações.
                        </p>
                      )}
                      {canManageInstallations && (
                        <div className="mt-3 border-t border-border/30 pt-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                            Adicionar outra empresa
                          </p>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <SearchableCompanyPicker
                                value={addCompanyByUpdateId[entry.id] ?? ""}
                                options={details.companyOptions.filter(
                                  (opt) => opt.id !== entry.companyId && opt.id !== UNLINKED_COMPANY_VALUE
                                )}
                                onChange={(val) => setAddCompanyByUpdateId((prev) => ({ ...prev, [entry.id]: val }))}
                                disabled={isRelinkingInstallation}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isRelinkingInstallation || !addCompanyByUpdateId[entry.id]}
                              onClick={() => {
                                const cid = addCompanyByUpdateId[entry.id];
                                if (cid) {
                                  handleAddCompanyToInstallation(entry.id, cid);
                                  setAddCompanyByUpdateId((prev) => ({ ...prev, [entry.id]: "" }));
                                }
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Versão do SysproServer.exe */}
                    {(() => {
                      const versionInfo = resolveSysproVersionInfoForPath(sysproVersionSnapshot, entry.path);
                      if (!versionInfo) return null;
                      const exeVersion = typeof versionInfo["exeVersion"] === "string" ? versionInfo["exeVersion"] : null;
                      const exeExists = versionInfo["exeExists"] === true;
                      const exeSizeMB = typeof versionInfo["exeSizeMB"] === "number" ? versionInfo["exeSizeMB"] : null;
                      return (
                        <div className="mt-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Versão SysproServer.exe</p>
                          <div className="mt-1 flex items-center gap-2">
                            {exeExists ? (
                              <span className="font-mono text-xs font-semibold text-foreground">{exeVersion ?? "Versão não lida"}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Executável não encontrado</span>
                            )}
                            {exeSizeMB && <span className="text-[10px] text-muted-foreground">({formatNumber(exeSizeMB, { maximumFractionDigits: 1 })} MB)</span>}
                            {exeExists && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500" />}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
              {installationFilter === "unlinked"
                ? "Nenhuma instalação sem vínculo encontrada para o filtro atual."
                : "Nenhuma instalação cadastrada ainda. Use o cadastro manual acima ou aguarde o próximo inventário do agente."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
