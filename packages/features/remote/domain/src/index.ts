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
} from "./remote-domain.port";
import { processAck } from "./use-cases/process-ack.use-case";
import { processBootstrap } from "./use-cases/process-bootstrap.use-case";
import { processDiscover } from "./use-cases/process-discover.use-case";
import { processHeartbeat } from "./use-cases/process-heartbeat.use-case";
import { processSync } from "./use-cases/process-sync.use-case";
import { createSession } from "./use-cases/create-session.use-case";
import { listSessions } from "./use-cases/list-sessions.use-case";
import { startSession } from "./use-cases/start-session.use-case";
import { stopSession } from "./use-cases/stop-session.use-case";
import { linkDiscoveredHost } from "./use-cases/link-discovered-host.use-case";
import { createHost } from "./use-cases/create-host.use-case";
import { updateHost } from "./use-cases/update-host.use-case";
import { deleteHost } from "./use-cases/delete-host.use-case";
import { ignoreDiscoveredHost } from "./use-cases/ignore-discovered-host.use-case";
import { reactivateDiscoveredHost } from "./use-cases/reactivate-discovered-host.use-case";
import { rotateHostAgentToken } from "./use-cases/rotate-host-agent-token.use-case";
import { revokeHostAgentToken } from "./use-cases/revoke-host-agent-token.use-case";
import { relinkHostSysproUpdate } from "./use-cases/relink-host-syspro-update.use-case";
import { listAddressBook } from "./use-cases/list-address-book.use-case";
import { listAddressBookCredentials } from "./use-cases/list-address-book-credentials.use-case";
import { createAddressBookCredential } from "./use-cases/create-address-book-credential.use-case";
import { rotateAddressBookCredential } from "./use-cases/rotate-address-book-credential.use-case";
import { revokeAddressBookCredential } from "./use-cases/revoke-address-book-credential.use-case";

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
    async ignoreDiscoveredHost(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return ignoreDiscoveredHost(payload, {
        port: deps.hostAdminPort,
      });
    },
    async reactivateDiscoveredHost(payload: unknown) {
      if (!deps.hostAdminPort) {
        throw new Error("HOST_ADMIN_PORT_NOT_CONFIGURED");
      }

      return reactivateDiscoveredHost(payload, {
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

export * from "./remote-domain.contracts";
export * from "./remote-domain.port";
export * from "./use-cases/process-heartbeat.use-case";
export * from "./use-cases/process-bootstrap.use-case";
export * from "./use-cases/process-ack.use-case";
export * from "./use-cases/process-sync.use-case";
export * from "./use-cases/process-discover.use-case";
export * from "./use-cases/create-session.use-case";
export * from "./use-cases/list-sessions.use-case";
export * from "./use-cases/start-session.use-case";
export * from "./use-cases/stop-session.use-case";
export * from "./use-cases/link-discovered-host.use-case";
export * from "./use-cases/create-host.use-case";
export * from "./use-cases/update-host.use-case";
export * from "./use-cases/delete-host.use-case";
export * from "./use-cases/ignore-discovered-host.use-case";
export * from "./use-cases/reactivate-discovered-host.use-case";
export * from "./use-cases/rotate-host-agent-token.use-case";
export * from "./use-cases/revoke-host-agent-token.use-case";
export * from "./use-cases/relink-host-syspro-update.use-case";
export * from "./use-cases/list-address-book.use-case";
export * from "./use-cases/list-address-book-credentials.use-case";
export * from "./use-cases/create-address-book-credential.use-case";
export * from "./use-cases/rotate-address-book-credential.use-case";
export * from "./use-cases/revoke-address-book-credential.use-case";

export type { RemoteDomainHttpError } from "./errors";
export { mapRemoteDomainError } from "./errors";







export * from './agent-token';
export * from './ack-reason-codes';
