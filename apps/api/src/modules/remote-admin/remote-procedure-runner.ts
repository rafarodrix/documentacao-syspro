import { HttpException } from '@nestjs/common';
import {
  createTrilinkRemote,
  mapRemoteDomainError,
} from '@dosc-syspro/remote-domain';
import {
  createRemoteAckPort,
  createRemoteAddressBookPort,
  createRemoteBootstrapPort,
  createRemoteDiscoverPort,
  createRemoteHostAdminPort,
  createRemoteSessionPort,
  createRemoteSyncPort,
} from '@dosc-syspro/remote-infra';

export type RemoteAdminProcedure =
  | 'sessionsList'
  | 'sessionsCreate'
  | 'sessionsStart'
  | 'sessionsStop'
  | 'linkDiscoveredHost'
  | 'ignoreDiscoveredHost'
  | 'hostsCreate'
  | 'hostsUpdate'
  | 'hostsDelete'
  | 'hostsRotateAgentToken'
  | 'hostsRevokeAgentToken'
  | 'hostsRelinkSysproUpdate'
  | 'addressBookList'
  | 'addressBookCredentialsList'
  | 'addressBookCredentialsCreate'
  | 'addressBookCredentialsRotate'
  | 'addressBookCredentialsRevoke';

export type RemoteIngressProcedure = 'discover' | 'bootstrap' | 'sync' | 'ack';

export type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

export type RemoteRequester = {
  userId: string;
  role: string;
};

export type RemoteScope = {
  isGlobalView: boolean;
  companyIds: string[];
};

const DISCOVER_TRANSITIONS = {
  pending_link: {
    state: 'PENDING_LINK',
    nextStep: 'manual_link',
    nextEndpoint: '/api/remote/discovered-hosts/:id/link',
    allowDiscoveryHeartbeat: true,
    requiresAuthenticatedBootstrap: false,
  },
  linked_host_detected: {
    state: 'LINKED',
    nextStep: 'stop_discover',
    nextEndpoint: '/api/remote/rustdesk/sync',
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
  host_bootstrap_required: {
    state: 'LINKED_BOOTSTRAP_REQUIRED',
    nextStep: 'bootstrap',
    nextEndpoint: '/api/remote/rustdesk/bootstrap',
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: true,
  },
  token_invalid: {
    state: 'TOKEN_INVALID',
    nextStep: 'bootstrap',
    nextEndpoint: '/api/remote/rustdesk/bootstrap',
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: true,
  },
} as const;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function throwMappedRemoteError(error: unknown): never {
  const mapped = mapRemoteDomainError(error, {
    defaultMessage: 'Falha inesperada no modulo remoto.',
  });

  throw new HttpException(
    {
      success: false,
      error: mapped.message,
      message: mapped.message,
      code: mapped.code,
      httpStatus: mapped.httpStatus,
      ...(mapped.data !== undefined ? { data: mapped.data } : {}),
    },
    mapped.httpStatus,
  );
}

function createRemoteFacade(logger: RemoteLogger, requestIp: string | null = null) {
  return createTrilinkRemote({
    discoverPort: createRemoteDiscoverPort({
      logger,
      transitions: DISCOVER_TRANSITIONS,
    }),
    bootstrapPort: createRemoteBootstrapPort({
      logger,
      requestIp,
    }),
    ackPort: createRemoteAckPort({ logger }),
    syncPort: createRemoteSyncPort({
      logger,
      requestIp,
    }),
    sessionPort: createRemoteSessionPort({ logger }),
    hostAdminPort: createRemoteHostAdminPort(),
    addressBookPort: createRemoteAddressBookPort(),
  });
}

function buildScope(scope: RemoteScope) {
  return {
    isGlobalView: scope.isGlobalView,
    companyIds: scope.companyIds,
  };
}

function buildActor(requester: RemoteRequester) {
  return {
    userId: requester.userId,
    role: requester.role,
  };
}

export async function executeRemoteAdminProcedure(input: {
  procedure: RemoteAdminProcedure;
  payload: unknown;
  requester: RemoteRequester;
  scope: RemoteScope;
  logger: RemoteLogger;
}) {
  const remote = createRemoteFacade(input.logger);
  const payload = asObject(input.payload);
  const scope = buildScope(input.scope);
  const actor = buildActor(input.requester);

  try {
    switch (input.procedure) {
      case 'sessionsList':
        return await remote.listSessions({ scope });
      case 'sessionsCreate':
        return await remote.createSession({ ...payload, scope, actor });
      case 'sessionsStart':
        return await remote.startSession({ ...payload, scope, actor });
      case 'sessionsStop':
        return await remote.stopSession({ ...payload, scope, actor });
      case 'linkDiscoveredHost':
        return await remote.linkDiscoveredHost({ ...payload, scope });
      case 'ignoreDiscoveredHost':
        return await remote.ignoreDiscoveredHost({ ...payload, scope });
      case 'hostsCreate':
        return await remote.createHost({ ...payload, scope });
      case 'hostsUpdate':
        return await remote.updateHost({ ...payload, scope });
      case 'hostsDelete':
        return await remote.deleteHost({ ...payload, scope });
      case 'hostsRotateAgentToken':
        return await remote.rotateHostAgentToken({ ...payload, scope });
      case 'hostsRevokeAgentToken':
        return await remote.revokeHostAgentToken({ ...payload, scope });
      case 'hostsRelinkSysproUpdate':
        return await remote.relinkHostSysproUpdate({ ...payload, scope });
      case 'addressBookList':
        return await remote.listAddressBook({ scope });
      case 'addressBookCredentialsList':
        return await remote.listAddressBookCredentials({});
      case 'addressBookCredentialsCreate':
        return await remote.createAddressBookCredential({
          ...payload,
          actorUserId: actor.userId,
        });
      case 'addressBookCredentialsRotate':
        return await remote.rotateAddressBookCredential({
          ...payload,
          actorUserId: actor.userId,
        });
      case 'addressBookCredentialsRevoke':
        return await remote.revokeAddressBookCredential({
          ...payload,
          actorUserId: actor.userId,
        });
      default: {
        const exhaustiveCheck: never = input.procedure;
        throw new Error(`REMOTE_PROCEDURE_NOT_SUPPORTED:${exhaustiveCheck}`);
      }
    }
  } catch (error) {
    throwMappedRemoteError(error);
  }
}

export async function executeRemoteIngressProcedure(input: {
  procedure: RemoteIngressProcedure;
  payload: unknown;
  logger: RemoteLogger;
  requestIp: string | null;
  requestId?: string;
  userAgent?: string | null;
}) {
  const remote = createRemoteFacade(input.logger, input.requestIp);
  const payload = asObject(input.payload);
  const enrichedPayload = {
    ...payload,
    metadata: {
      ...(payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : {}),
      ip: input.requestIp,
      userAgent: input.userAgent ?? null,
      correlationId: input.requestId ?? null,
    },
  };

  try {
    switch (input.procedure) {
      case 'discover':
        return await remote.processDiscover(enrichedPayload);
      case 'bootstrap':
        return await remote.processBootstrap(enrichedPayload);
      case 'sync':
        return await remote.processSync(enrichedPayload);
      case 'ack':
        return await remote.processAck(enrichedPayload);
      default: {
        const exhaustiveCheck: never = input.procedure;
        throw new Error(`REMOTE_INGRESS_PROCEDURE_NOT_SUPPORTED:${exhaustiveCheck}`);
      }
    }
  } catch (error) {
    throwMappedRemoteError(error);
  }
}
