import type { RemoteOperationalStatus } from "@dosc-syspro/contracts/remote";

export type RemoteOperationalStatusInput = {
  rustdeskId: string | null;
  installToken: string | null;
  lastHeartbeatAt: string | Date | null;
  openSessionCount: number;
};

export function resolveRemoteOperationalStatus(
  input: RemoteOperationalStatusInput,
): RemoteOperationalStatus {
  if (!input.rustdeskId || !input.installToken) {
    return "MISCONFIGURED";
  }

  if (input.openSessionCount > 0) {
    return "SESSION_BUSY";
  }

  if (!input.lastHeartbeatAt) {
    return "OFFLINE";
  }

  const lastHeartbeatAt = new Date(input.lastHeartbeatAt);
  const diffMinutes = Math.floor((Date.now() - lastHeartbeatAt.getTime()) / 60000);

  if (diffMinutes <= 5) return "ONLINE";
  if (diffMinutes <= 60) return "RECENT";
  return "OFFLINE";
}
