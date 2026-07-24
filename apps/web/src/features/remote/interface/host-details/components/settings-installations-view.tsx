import { Loader2, Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { SearchableCompanyPicker } from "./searchable-company-picker";
import { resolveSysproServerForPath } from "../host-details.helpers";
import { DEFAULT_INSTALLATION_DIRECTORY } from "../host-details.constants";

type InstallationContext = RemoteHostDetails["installationContexts"][number];
type HostInstallationsPanelDetails = Pick<RemoteHostDetails, "company" | "companyOptions">;

export function resolveSysproVersionInfoForPath(
  sysproVersionSnapshot: Record<string, unknown> | null,
  installationPath: string,
) {
  return resolveSysproServerForPath(sysproVersionSnapshot, installationPath);
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
};

export function SettingsInstallationsView({
  details,
  canManageInstallations,
  manualInstallationCompanyId,
  setManualInstallationCompanyId,
  manualInstallationPath,
  setManualInstallationPath,
  isCreatingManualInstallation,
  handleCreateManualInstallation,
}: SettingsInstallationsViewProps) {
  return (
    <div className="space-y-6">
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
                  Defina qual empresa usa cada diretório deste host. A{" "}
                  <span className="font-medium text-foreground">empresa principal do dispositivo</span>{" "}
                  continua no vínculo do host; aqui você amarra empresas por instalação (pasta/porta),
                  inclusive quando há mais de um Syspro na mesma máquina.
                </p>
                <p className="text-xs text-muted-foreground">
                  Porta e tipo Syspro Server/IIS são configurados em{" "}
                  <span className="font-medium text-foreground">ERP → Instalações</span>, não no cadastro da empresa.
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
