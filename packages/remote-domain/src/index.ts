import type {
  RemoteAckPort,
  RemoteBootstrapPort,
  RemoteDiscoverPort,
  RemoteHeartbeatPort,
  RemoteSyncPort,
  TrilinkRemoteDomain,
} from "./ports";
import { processAck } from "./use-cases/process-ack";
import { processBootstrap } from "./use-cases/process-bootstrap";
import { processDiscover } from "./use-cases/process-discover";
import { processHeartbeat } from "./use-cases/process-heartbeat";
import { processSync } from "./use-cases/process-sync";

export function createTrilinkRemote(deps: {
  heartbeatPort?: RemoteHeartbeatPort;
  bootstrapPort?: RemoteBootstrapPort;
  ackPort?: RemoteAckPort;
  syncPort?: RemoteSyncPort;
  discoverPort?: RemoteDiscoverPort;
  now?: () => Date;
}): TrilinkRemoteDomain {
  return {
    async processHeartbeat(payload: unknown) {
      if (!deps.heartbeatPort) {
        throw new Error("HEARTBEAT_PORT_NOT_CONFIGURED");
      }

      return processHeartbeat(payload, {
        port: deps.heartbeatPort,
        now: deps.now,
      });
    },
    async processBootstrap(payload: unknown) {
      if (!deps.bootstrapPort) {
        throw new Error("BOOTSTRAP_PORT_NOT_CONFIGURED");
      }

      return processBootstrap(payload, {
        port: deps.bootstrapPort,
      });
    },
    async processAck(payload: unknown) {
      if (!deps.ackPort) {
        throw new Error("ACK_PORT_NOT_CONFIGURED");
      }

      return processAck(payload, {
        port: deps.ackPort,
        now: deps.now,
      });
    },
    async processSync(payload: unknown) {
      if (!deps.syncPort) {
        throw new Error("SYNC_PORT_NOT_CONFIGURED");
      }

      return processSync(payload, {
        port: deps.syncPort,
        now: deps.now,
      });
    },
    async processDiscover(payload: unknown) {
      if (!deps.discoverPort) {
        throw new Error("DISCOVER_PORT_NOT_CONFIGURED");
      }

      return processDiscover(payload, {
        port: deps.discoverPort,
        now: deps.now,
      });
    },
  };
}

export * from "./contracts";
export * from "./ports";
export * from "./use-cases/process-heartbeat";
export * from "./use-cases/process-bootstrap";
export * from "./use-cases/process-ack";
export * from "./use-cases/process-sync";
export * from "./use-cases/process-discover";
