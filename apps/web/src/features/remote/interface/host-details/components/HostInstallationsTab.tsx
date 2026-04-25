import { HardDriveDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SearchableCompanyPicker } from "./SearchableCompanyPicker";
import { formatDateTime, getSysproUpdateHealthMeta } from "../utils";
import { COMPANY_SERVER_TYPE_LABEL, DEFAULT_INSTALLATION_DIRECTORY, MACHINE_PROFILE_LABEL, REMOTE_CONNECTION_LABEL, UNLINKED_COMPANY_VALUE } from "../constants";

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
  machineProfileDraft,
  setMachineProfileDraft,
  isSavingMachineProfile,
  handleSaveMachineProfile,
}: {
  details: any;
  installationFilter: "all" | "unlinked";
  setInstallationFilter: (v: "all" | "unlinked") => void;
  canManageInstallations: boolean;
  bulkInstallationCompanyId: string;
  setBulkInstallationCompanyId: (v: string) => void;
  isBulkRelinkingInstallations: boolean;
  handleBulkRelinkInstallations: (id: string | null) => void;
  dedupedInstallationContexts: any[];
  unlinkedInstallationsCount: number;
  installationContextsForDisplay: any[];
  selectedCompanyByUpdateId: Record<string, string>;
  setSelectedCompanyByUpdateId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isRelinkingInstallation: boolean;
  handleRelinkInstallation: (updateId: string, companyId: string | null) => void;
  machineProfileDraft: string;
  setMachineProfileDraft: (value: string) => void;
  isSavingMachineProfile: boolean;
  handleSaveMachineProfile: (value: string | null) => void;
}) {
  const primaryCompanyName =
    details.host?.companyName ??
    details.company?.nomeFantasia ??
    details.company?.razaoSocial ??
    "Sem empresa principal vinculada";

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Instalacoes detectadas</CardTitle>
          <CardDescription>
            A empresa principal do host ja foi definida no vinculo inicial. Use esta aba para revisar as instalacoes detectadas e, quando necessario, vincular empresas adicionais por instalacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-background/40 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa principal do host</p>
            <p className="mt-1 text-sm font-medium text-foreground">{primaryCompanyName}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              O fluxo padrao e herdar esta empresa como referencia principal da maquina. Vinculos nesta aba so devem complementar cenarios com multiplas instalacoes ou diretorios separados no mesmo host.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_auto] lg:items-end">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Perfil da maquina</p>
                <Select
                  value={machineProfileDraft}
                  onValueChange={setMachineProfileDraft}
                  disabled={isSavingMachineProfile || !canManageInstallations}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil operacional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVER">{MACHINE_PROFILE_LABEL.SERVER}</SelectItem>
                    <SelectItem value="WORKSTATION">{MACHINE_PROFILE_LABEL.WORKSTATION}</SelectItem>
                    <SelectItem value="TERMINAL">{MACHINE_PROFILE_LABEL.TERMINAL}</SelectItem>
                    <SelectItem value="BACKUP_NODE">{MACHINE_PROFILE_LABEL.BACKUP_NODE}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                disabled={
                  isSavingMachineProfile ||
                  !canManageInstallations ||
                  !machineProfileDraft ||
                  machineProfileDraft === (details.host.machineProfile ?? "")
                }
                onClick={() => handleSaveMachineProfile(machineProfileDraft || null)}
              >
                Salvar perfil da maquina
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Este perfil orienta o comportamento esperado do host para suporte, inventario e politicas futuras de backup por diretorio.
            </p>
            {!canManageInstallations ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Seu perfil tem acesso somente leitura para classificar a maquina.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto] lg:items-end">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Filtro</p>
                <Select
                  value={installationFilter}
                  onValueChange={(value: "all" | "unlinked") => setInstallationFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as instalacoes</SelectItem>
                    <SelectItem value="unlinked">Somente sem vinculo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {canManageInstallations ? (
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Empresa adicional para instalacoes filtradas
                  </p>
                  <SearchableCompanyPicker
                    value={bulkInstallationCompanyId || UNLINKED_COMPANY_VALUE}
                    options={details.companyOptions}
                    onChange={(next) =>
                      setBulkInstallationCompanyId(next === UNLINKED_COMPANY_VALUE ? "" : next)
                    }
                    disabled={isBulkRelinkingInstallations || !details.companyOptions.length}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground lg:pb-2">
                  Seu perfil tem acesso somente leitura para vinculacao de instalacoes.
                </p>
              )}

              {canManageInstallations ? (
                <Button
                  size="sm"
                  disabled={
                    isBulkRelinkingInstallations ||
                    !bulkInstallationCompanyId ||
                    !installationContextsForDisplay.length
                  }
                  onClick={() => handleBulkRelinkInstallations(bulkInstallationCompanyId)}
                >
                  Aplicar empresa nas filtradas
                </Button>
              ) : null}
              {canManageInstallations ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkRelinkingInstallations || !installationContextsForDisplay.length}
                  onClick={() => handleBulkRelinkInstallations(null)}
                >
                  Limpar vinculos filtrados
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {installationFilter === "unlinked"
                ? `${installationContextsForDisplay.length} instalacao(oes) sem vinculo exibida(s).`
                : `${dedupedInstallationContexts.length} instalacao(oes) detectada(s), ${unlinkedInstallationsCount} sem vinculo.`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use o vinculo adicional por instalacao para orientar inventario, caminhos de backup e responsabilidades por diretorio quando houver mais de uma empresa no mesmo host.
            </p>
          </div>
          {installationContextsForDisplay.length ? (
            <div className="space-y-4">
              {installationContextsForDisplay.map((context, index) => {
              const entry = context.update;
              const companyContext = context.company;
              const primaryCompanyDirectory = details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
              const companyName = companyContext?.nomeFantasia ?? companyContext?.razaoSocial ?? "Sem empresa vinculada";
              const serverType = companyContext?.serverType ? COMPANY_SERVER_TYPE_LABEL[companyContext.serverType as keyof typeof COMPANY_SERVER_TYPE_LABEL] : "Nao configurado";
              const companyDirectory = companyContext?.installationDirectory?.trim();
              const installationDirectory =
                companyContext
                  ? (companyDirectory || primaryCompanyDirectory || DEFAULT_INSTALLATION_DIRECTORY)
                  : (entry.path?.trim() || DEFAULT_INSTALLATION_DIRECTORY);
              const updateHealthMeta = getSysproUpdateHealthMeta({
                isServerHost: entry.isServerHost,
                lastFileWriteAt: entry.lastFileWriteAt,
              });

              return (
                <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <HardDriveDownload className="h-4 w-4 text-muted-foreground" />
                    Instalacao {index + 1}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da empresa</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{companyName}</p>
                      {!entry.companyId ? (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                          Instalacao sem vinculo formal com empresa do cadastro.
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de servidor</p>
                      <p className="mt-1 text-sm text-foreground">{serverType}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Caminho monitorado (diretorio empresa)
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-foreground">{installationDirectory}</p>
                    </div>
                  </div>

                  <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">Informacoes do servidor</summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servidor</p>
                        <p className="mt-1 text-sm text-foreground">{entry.companyId ? (companyContext?.serverHost ?? "Nao configurado") : "Sem vinculo"}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Porta</p>
                        <p className="mt-1 text-sm text-foreground">
                          {entry.companyId ? (companyContext?.serverPort ? String(companyContext.serverPort) : "Nao configurado") : "Sem vinculo"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conexao</p>
                        <p className="mt-1 text-sm text-foreground">{entry.companyId ? (companyContext?.serverProtocol ?? "Nao configurado") : "Sem vinculo"}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Url Path (ISAPI)</p>
                        <p className="mt-1 break-all text-sm text-foreground">{entry.companyId ? (companyContext?.iisIsapiPath ?? "Nao configurado") : "Sem vinculo"}</p>
                      </div>
                    </div>
                  </details>

                  <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">Observacoes</summary>
                    <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {entry.companyId
                          ? (companyContext?.observacoes ?? "Sem observacoes operacionais para esta empresa.")
                          : "Sem vinculo com empresa do cadastro para exibir observacoes."}
                      </p>
                    </div>
                  </details>

                  <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">Conexao remota</summary>
                    <div className="mt-3 space-y-3">
                      {entry.companyId && companyContext?.remoteConnections.length ? (
                        companyContext.remoteConnections.map((connection: any, connectionIndex: number) => (
                          <div key={`${connection.type}-${connectionIndex}`} className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{REMOTE_CONNECTION_LABEL[connection.type as keyof typeof REMOTE_CONNECTION_LABEL]}</p>
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Nome/IP/identificacao</p>
                            <p className="mt-1 break-all text-sm text-foreground">{connection.details || "Sem detalhe informado"}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-3">
                          {entry.companyId
                            ? "Nenhuma conexao remota cadastrada para esta empresa."
                            : "Sem vinculo com empresa do cadastro para exibir conexoes remotas."}
                        </div>
                      )}
                    </div>
                  </details>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultima atualizacao</p>
                      <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastFileWriteAt)}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3", updateHealthMeta.className)}>
                      <p className="text-[11px] uppercase tracking-wide opacity-80">Saude de atualizacao</p>
                      <p className="mt-1 text-sm font-medium">{updateHealthMeta.label}</p>
                      <p className="mt-1 text-xs opacity-90">{updateHealthMeta.detail}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat</p>
                      <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastHeartbeatAt)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa vinculada</p>
                      <p className="mt-1 text-sm text-foreground">{entry.companyId ? "Vinculada" : "Sem vinculo"}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/40 bg-background/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa desta instalacao</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se esta instalacao pertencer a outra empresa hospedada na mesma maquina, ajuste o vinculo aqui. Caso contrario, mantenha a empresa principal do host.
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
                            const selected =
                              selectedCompanyByUpdateId[entry.id] ??
                              (entry.companyId ?? UNLINKED_COMPANY_VALUE);
                            handleRelinkInstallation(
                              entry.id,
                              selected === UNLINKED_COMPANY_VALUE ? null : selected
                            );
                          }}
                        >
                          Aplicar vinculo
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
                          Limpar vinculo
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Seu perfil tem acesso somente leitura para vinculacao de instalacoes.
                      </p>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
              {installationFilter === "unlinked"
                ? "Nenhuma instalacao sem vinculo encontrada para o filtro atual."
                : "Esta maquina ainda nao enviou instalacoes no heartbeat."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
