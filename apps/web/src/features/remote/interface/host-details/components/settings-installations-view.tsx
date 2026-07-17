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

export type SettingsInstallationsViewProps = {
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

export function SettingsInstallationsView({
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
}: SettingsInstallationsViewProps) {
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
    </div>
  );
}
