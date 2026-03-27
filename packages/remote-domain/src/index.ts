import type {
  RemoteAckPort,
  RemoteBootstrapPort,
  RemoteDiscoverPort,
  RemoteHeartbeatPort,
  RemoteSessionPort,
  RemoteSyncPort,
  TrilinkRemoteDomain,
} from "./ports";
import { processAck } from "./use-cases/process-ack";
import { processBootstrap } from "./use-cases/process-bootstrap";
import { processDiscover } from "./use-cases/process-discover";
import { processHeartbeat } from "./use-cases/process-heartbeat";
import { processSync } from "./use-cases/process-sync";
import { createSession } from "./use-cases/create-session";
import { listSessions } from "./use-cases/list-sessions";
import { startSession } from "./use-cases/start-session";
import { stopSession } from "./use-cases/stop-session";

export function createTrilinkRemote(deps: {
  heartbeatPort?: RemoteHeartbeatPort;
  bootstrapPort?: RemoteBootstrapPort;
  ackPort?: RemoteAckPort;
  syncPort?: RemoteSyncPort;
  discoverPort?: RemoteDiscoverPort;
  sessionPort?: RemoteSessionPort;
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
    async listSessions(payload: unknown) {
      if (!deps.sessionPort) {
        throw new Error("SESSION_PORT_NOT_CONFIGURED");
      }

      return listSessions(payload, {
        port: deps.sessionPort,
      });
    },
    async createSession(payload: unknown) {
      if (!deps.sessionPort) {
        throw new Error("SESSION_PORT_NOT_CONFIGURED");
      }

      return createSession(payload, {
        port: deps.sessionPort,
        now: deps.now,
      });
    },
    async startSession(payload: unknown) {
      if (!deps.sessionPort) {
        throw new Error("SESSION_PORT_NOT_CONFIGURED");
      }

      return startSession(payload, {
        port: deps.sessionPort,
        now: deps.now,
      });
    },
    async stopSession(payload: unknown) {
      if (!deps.sessionPort) {
        throw new Error("SESSION_PORT_NOT_CONFIGURED");
      }

      return stopSession(payload, {
        port: deps.sessionPort,
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
export * from "./use-cases/create-session";
export * from "./use-cases/list-sessions";
export * from "./use-cases/start-session";
export * from "./use-cases/stop-session";