export const COMMAND_PROCESSED = "COMMAND_PROCESSED" as const;
export const REAPPLY_ALIAS_NOOP = "REAPPLY_ALIAS_NOOP" as const;
export const REAPPLY_CONFIG_NOOP = "REAPPLY_CONFIG_NOOP" as const;
export const UPGRADE_CLIENT_SUCCESS = "UPGRADE_CLIENT_SUCCESS" as const;
export const ROTATE_TOKEN_REQUIRED = "ROTATE_TOKEN_REQUIRED" as const;
export const COMMAND_UNKNOWN = "COMMAND_UNKNOWN" as const;
export const COMMAND_EXECUTION_FAILED = "COMMAND_EXECUTION_FAILED" as const;

export const REMOTE_AGENT_ACK_REASON_CODES = [
  COMMAND_PROCESSED,
  REAPPLY_ALIAS_NOOP,
  REAPPLY_CONFIG_NOOP,
  UPGRADE_CLIENT_SUCCESS,
  ROTATE_TOKEN_REQUIRED,
  COMMAND_UNKNOWN,
  COMMAND_EXECUTION_FAILED,
] as const;

export type RemoteAgentAckReasonCode = (typeof REMOTE_AGENT_ACK_REASON_CODES)[number];

const REMOTE_AGENT_ACK_REASON_CODE_SET = new Set<string>(REMOTE_AGENT_ACK_REASON_CODES);

export function isRemoteAgentAckReasonCode(value: string | null | undefined): value is RemoteAgentAckReasonCode {
  if (!value) return false;
  return REMOTE_AGENT_ACK_REASON_CODE_SET.has(value);
}
