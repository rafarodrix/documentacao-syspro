"use client";

import { ArrowRightLeft, Copy, Fingerprint, HardDriveDownload, RefreshCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { MACHINE_PROFILE_LABEL } from "../host-details.constants";

const UPCOMING_FEATURES = [
  {
    title: "Políticas de acesso",
    description: "Restrições de horário, IP e perfil de usuário para controle granular de quem pode acessar o host.",
  },
  {
    title: "Vault de credenciais",
    description: "Armazenamento seguro de credenciais de acesso local com rotação automática e auditoria.",
  },
  {
    title: "Alertas e monitoramento",
    description: "Notificações proativas para CPU crítica, disco baixo, agente offline e falhas de serviço.",
  },
] as const;

type Props = {
  details: RemoteHostDetails;
  projectedMachineProfile: RemoteHostDetails["host"]["machineProfile"];
  setProjectedMachineProfile: (value: RemoteHostDetails["host"]["machineProfile"]) => void;
  isSavingMachineName: boolean;
  canSaveProjectedHostName: boolean;
  onSaveHostName: () => void;
  isRevokingAgentToken: boolean;
  onRotateAgentToken: () => void;
  isRequestingResendConfig: boolean;
  isRequestingSelfHeal: boolean;
  onRequestRemoteAction: (action: "RESEND_CONFIG" | "REAPPLY_ALIAS") => void;
};

export function HostSettingsTab({
  details,
  projectedMachineProfile,
  setProjectedMachineProfile,
  isSavingMachineName,
  canSaveProjectedHostName,
  onSaveHostName,
  isRevokingAgentToken,
  onRotateAgentToken,
  isRequestingResendConfig,
  isRequestingSelfHeal,
  onRequestRemoteAction,
}: Props) {
  const { moduleSettings } = details;

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Perfil remoto aplicado</CardTitle>
          <CardDescription>Configuração efetiva esperada pelo portal para o agente e o RustDesk neste host.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Servidor remoto</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskServerHost.trim() || "Sem configuração"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Versão alvo do RustDesk</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskVersion.trim() || "Sem configuração"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Hash da chave pública</p>
              <p className="mt-1 break-all text-sm font-medium text-foreground">
                {moduleSettings.rustDeskPublicKeyHash?.trim() || "Sem configuração"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Auto instalar</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAutoInstall ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Auto atualizar</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAutoUpgrade ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Reiniciar serviço após aplicar</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskRestartServiceAfterApply ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Suprimir atalhos da tray</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskSuppressTrayShortcuts ? "Ativo" : "Inativo"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Ocultar tray</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskHideTray ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Ocultar parar serviço</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskHideStopService ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Permitir configuração remota local</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAllowRemoteConfigModification ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">DirectX Capture</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskEnableDirectXCapture ? "Ativo" : "Inativo"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Permitir render D3D</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAllowD3DRender ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">Tipo do pacote</p>
              <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskInstallerPackageType}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground">SHA256 do instalador</p>
              <p className="mt-1 break-all text-sm font-medium text-foreground">
                {moduleSettings.rustDeskInstallerSha256.trim() || "Não definido"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-xs text-muted-foreground">URL do instalador</p>
            <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskInstallerUrl.trim() || "Não definido"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-xs text-muted-foreground">Argumentos do instalador</p>
            <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskInstallArgs.trim() || "Não definido"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-xs text-muted-foreground">Configuração exportada do servidor</p>
            <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskServerConfig.trim() || "Sem configuração"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-xs text-muted-foreground">Chave pública exportada</p>
            <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskPublicKey.trim() || "Sem configuração"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Identidade do host</CardTitle>
          <CardDescription>Nome e perfil da máquina usados pelo portal para identificação e filtragem.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tipo do host</p>
            <Select
              value={projectedMachineProfile ?? "__none__"}
              onValueChange={(value) =>
                setProjectedMachineProfile(value === "__none__" ? null : (value as RemoteHostDetails["host"]["machineProfile"]))
              }
              disabled={isSavingMachineName}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não definido</SelectItem>
                {Object.entries(MACHINE_PROFILE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={onSaveHostName}
            disabled={isSavingMachineName || !canSaveProjectedHostName}
            className="gap-2"
          >
            {isSavingMachineName ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            {isSavingMachineName ? "Salvando..." : "Salvar host"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Ações do agente</CardTitle>
          <CardDescription>
            Ações manuais de recuperação, bootstrap e reconfiguração do módulo remoto. Use quando a máquina parar no fluxo ou divergir do perfil esperado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRotateAgentToken} disabled={isRevokingAgentToken} className="gap-2">
              <Fingerprint className="h-4 w-4" />
              {isRevokingAgentToken ? "Solicitando..." : "Forçar inicialização remota"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onRequestRemoteAction("RESEND_CONFIG")}
              disabled={isRequestingResendConfig}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {isRequestingResendConfig ? "Solicitando..." : "Reaplicar configuração do módulo"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onRequestRemoteAction("REAPPLY_ALIAS")}
              disabled={isRequestingSelfHeal}
              className="gap-2"
            >
              <HardDriveDownload className="h-4 w-4" />
              {isRequestingSelfHeal ? "Solicitando..." : "Reaplicar alias do RustDesk"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            &ldquo;Forçar inicialização remota&rdquo; invalida a credencial atual e faz o agente executar novo bootstrap autenticado no próximo ciclo.
          </p>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Funcionalidades em desenvolvimento</p>
        <div className="grid gap-4 md:grid-cols-2">
          {UPCOMING_FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-dashed border-border/40 bg-muted/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{feature.title}</p>
                <Badge
                  variant="outline"
                  className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
                >
                  Em desenvolvimento
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
