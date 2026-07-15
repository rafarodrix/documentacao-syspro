import { REMOTE_AGENT_ACK_REASON_LABELS, type RemoteAgentAckReasonCode } from "@dosc-syspro/remote-domain/ack-reason-codes";
import type { RemoteMachineProfile } from "@dosc-syspro/contracts/remote";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

export const COMPANY_SERVER_TYPE_LABEL: Record<"SYSPRO_SERVER" | "IIS", string> = {
  SYSPRO_SERVER: "Syspro Server",
  IIS: "IIS",
};

export const REMOTE_CONNECTION_LABEL: Record<"DDNS_NOIP" | "RADMIN_VPN", string> = {
  DDNS_NOIP: "DDNS (NoIP)",
  RADMIN_VPN: "Radmin VPN",
};

export const DEFAULT_INSTALLATION_DIRECTORY = "C:\\Syspro\\SysproServer.exe";
export const UNLINKED_COMPANY_VALUE = "__unlinked__";

export const MACHINE_PROFILE_LABEL: Record<RemoteMachineProfile, string> = {
  SERVER: "Servidor",
  WORKSTATION: "Estacao",
  TERMINAL: "Terminal",
  BACKUP_NODE: "Backup node",
};

export const EXPECTED_SCHEMA_VERSIONS = {
  discover: "discover.payload.v1",
  sync: "sync.payload.v1",
  ack: "ack.payload.v1",
} as const;

export const AGENT_COMMAND_LABEL: Record<
  "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "SERVICE_CONTROL" | "ROTATE_TOKEN_REQUIRED",
  string
> = {
  REAPPLY_ALIAS: "Reaplicar alias",
  REAPPLY_CONFIG: "Reaplicar configuracao",
  UPGRADE_CLIENT: "Atualizar cliente",
  SERVICE_CONTROL: "Controlar servico",
  ROTATE_TOKEN_REQUIRED: "Renovacao de credencial obrigatoria",
};

export const AGENT_ACK_REASON_LABEL: Record<RemoteAgentAckReasonCode, string> = REMOTE_AGENT_ACK_REASON_LABELS;
