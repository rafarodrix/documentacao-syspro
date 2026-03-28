import type {
  RemoteAckPort,
  RemoteAddressBookPort,
  RemoteBootstrapPort,
  RemoteDiscoverPort,
  RemoteHeartbeatPort,
  RemoteHostAdminPort,
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
import { linkDiscoveredHost } from "./use-cases/link-discovered-host";
import { createHost } from "./use-cases/create-host";
import { updateHost } from "./use-cases/update-host";
import { deleteHost } from "./use-cases/delete-host";
import { rotateHostAgentToken } from "./use-cases/rotate-host-agent-token";
import { rotateHostInstallToken } from "./use-cases/rotate-host-install-token";
import { revokeHostAgentToken } from "./use-cases/revoke-host-agent-token";
import { relinkHostSysproUpdate } from "./use-cases/relink-host-syspro-update";
import { listAddressBook } from "./use-cases/list-address-book";
import { listAddressBookCredentials } from "./use-cases/list-address-book-credentials";
import { createAddressBookCredential } from "./use-cases/create-address-book-credential";
import { rotateAddressBookCredential } from "./use-cases/rotate-address-book-credential";
import { revokeAddressBookCredential } from "./use-cases/revoke-address-book-credential";

export function createTrilinkRemote(deps: {
  heartbeatPort?: RemoteHeartbeatPort;
  bootstrapPort?: RemoteBootstrapPort;
  ackPort?: RemoteAckPort;
  syncPort?: RemoteSyncPort;
  discoverPort?: RemoteDiscoverPort;
  sessionPort?: RemoteSessionPort;
  hostAdminPort?: RemoteHostAdminPort;
  addressBookPort?: RemoteAddressBookPort;
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
    async linkDiscoveredHost(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return linkDiscoveredHost(payload, {
        port: deps.hostAdminPort,
      });
    },
    async createHost(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return createHost(payload, {
        port: deps.hostAdminPort,
      });
    },
    async updateHost(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return updateHost(payload, {
        port: deps.hostAdminPort,
      });
    },
    async deleteHost(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return deleteHost(payload, {
        port: deps.hostAdminPort,
      });
    },
    async rotateHostAgentToken(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return rotateHostAgentToken(payload, {
        port: deps.hostAdminPort,
      });
    },
    async rotateHostInstallToken(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return rotateHostInstallToken(payload, {
        port: deps.hostAdminPort,
      });
    },
    async revokeHostAgentToken(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return revokeHostAgentToken(payload, {
        port: deps.hostAdminPort,
      });
    },
    async relinkHostSysproUpdate(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return relinkHostSysproUpdate(payload, {
        port: deps.hostAdminPort,
      });
    },
    async listAddressBook(payload: unknown) {
      if (!deps.addressBookPort) {
        throw new Error("ADDRESS_BOOK_PORT_NOT_CONFIGURED");
      }

      return listAddressBook(payload, {
        port: deps.addressBookPort,
      });
    },
    async listAddressBookCredentials(payload: unknown) {
      if (!deps.addressBookPort) {
        throw new Error("ADDRESS_BOOK_PORT_NOT_CONFIGURED");
      }

      return listAddressBookCredentials(payload, {
        port: deps.addressBookPort,
      });
    },
    async createAddressBookCredential(payload: unknown) {
      if (!deps.addressBookPort) {
        throw new Error("ADDRESS_BOOK_PORT_NOT_CONFIGURED");
      }

      return createAddressBookCredential(payload, {
        port: deps.addressBookPort,
      });
    },
    async rotateAddressBookCredential(payload: unknown) {
      if (!deps.addressBookPort) {
        throw new Error("ADDRESS_BOOK_PORT_NOT_CONFIGURED");
      }

      return rotateAddressBookCredential(payload, {
        port: deps.addressBookPort,
      });
    },
    async revokeAddressBookCredential(payload: unknown) {
      if (!deps.addressBookPort) {
        throw new Error("ADDRESS_BOOK_PORT_NOT_CONFIGURED");
      }

      return revokeAddressBookCredential(payload, {
        port: deps.addressBookPort,
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
export * from "./use-cases/link-discovered-host";
export * from "./use-cases/create-host";
export * from "./use-cases/update-host";
export * from "./use-cases/delete-host";
export * from "./use-cases/rotate-host-agent-token";
export * from "./use-cases/rotate-host-install-token";
export * from "./use-cases/revoke-host-agent-token";
export * from "./use-cases/relink-host-syspro-update";
export * from "./use-cases/list-address-book";
export * from "./use-cases/list-address-book-credentials";
export * from "./use-cases/create-address-book-credential";
export * from "./use-cases/rotate-address-book-credential";
export * from "./use-cases/revoke-address-book-credential";

export type { RemoteDomainHttpError } from "./errors";
export { mapRemoteDomainError } from "./errors";






