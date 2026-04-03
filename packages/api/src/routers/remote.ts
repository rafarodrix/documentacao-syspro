import type { z } from "zod";
import {
  createAddressBookCredentialInputSchema,
  createHostInputSchema,
  createSessionInputSchema,
  deleteHostInputSchema,
  hostAgentTokenInputSchema,
  linkDiscoveredHostInputSchema,
  listAddressBookCredentialsInputSchema,
  listAddressBookInputSchema,
  listSessionsInputSchema,
  processAckInputSchema,
  processBootstrapInputSchema,
  processDiscoverInputSchema,
  processSyncInputSchema,
  relinkHostSysproUpdateInputSchema,
  revokeAddressBookCredentialInputSchema,
  rotateAddressBookCredentialInputSchema,
  startSessionInputSchema,
  stopSessionInputSchema,
  updateHostInputSchema,
} from "@dosc-syspro/remote-domain/contracts";
import { createTrilinkRemote, mapRemoteDomainError } from "@dosc-syspro/remote-domain";
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";
import type { ApiContext } from "../lib/contracts";
import {
  createRemoteAckPort,
  createRemoteAddressBookPort,
  createRemoteBootstrapPort,
  createRemoteDiscoverPort,
  createRemoteHostAdminPort,
  createRemoteSessionPort,
  createRemoteSyncPort,
  revokeExpiredSyncAgentToken,
} from "../remote-domain-ports";

const GLOBAL_SCOPE_ROLES = new Set(["ADMIN", "SUPORTE", "DEVELOPER"]);

const DISCOVER_TRANSITIONS = {
  pending_link: {
    state: "DISCOVERY_PENDING_LINK",
    nextStep: "link_discovered_host_then_bootstrap",
    nextEndpoint: "/api/remote/discovered-hosts/:id/link",
    allowDiscoveryHeartbeat: true,
    requiresAuthenticatedBootstrap: false,
  },
  linked_host_detected: {
    state: "DISCOVERY_LINKED_HOST",
    nextStep: "host_already_linked_keep_bootstrap_sync_flow",
    nextEndpoint: "/api/remote/rustdesk/sync",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
  host_bootstrap_required: {
    state: "DISCOVERY_LINKED_HOST_BOOTSTRAP_REQUIRED",
    nextStep: "run_authenticated_bootstrap",
    nextEndpoint: "/api/remote/rustdesk/bootstrap",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
  token_invalid: {
    state: "DISCOVERY_LINKED_HOST_TOKEN_INVALID",
    nextStep: "run_authenticated_bootstrap",
    nextEndpoint: "/api/remote/rustdesk/bootstrap",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
};

type ZodSchema<T> = z.ZodType<T>;

function mapRemoteErrorToApiError(error: unknown): never {
  const mapped = mapRemoteDomainError(error, {
    validationMessage: "Payload remoto invalido.",
    defaultMessage: "Erro interno do dominio remoto.",
  });

  const code =
    mapped.httpStatus === 401
      ? "UNAUTHORIZED"
      : mapped.httpStatus === 403
        ? "FORBIDDEN"
        : mapped.httpStatus >= 400 && mapped.httpStatus < 500
          ? "BAD_REQUEST"
          : "INTERNAL_ERROR";

  throw new ApiError(mapped.message, code, {
    remote: mapped,
    original: error,
  });
}

function createRemoteService(ctx: ApiContext) {
  const logger = {
    info: (event: string, fields?: Record<string, unknown>) => ctx.logger.info(event, fields),
    warn: (event: string, fields?: Record<string, unknown>) => ctx.logger.warn(event, fields),
    error: (event: string, fields?: Record<string, unknown>) => ctx.logger.error(event, fields),
  };

  return createTrilinkRemote({
    discoverPort: createRemoteDiscoverPort({ logger, transitions: DISCOVER_TRANSITIONS }),
    bootstrapPort: createRemoteBootstrapPort({ logger, requestIp: ctx.requestIp ?? null }),
    syncPort: createRemoteSyncPort({ logger, requestIp: ctx.requestIp ?? null }),
    ackPort: createRemoteAckPort({ logger }),
    sessionPort: createRemoteSessionPort({ logger }),
    hostAdminPort: createRemoteHostAdminPort(),
    addressBookPort: createRemoteAddressBookPort(),
  });
}

function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError("Payload invalido para rota remota.", "BAD_REQUEST", {
      issues: parsed.error.issues,
    });
  }

  return parsed.data;
}

function asObject(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function sanitizeAuthenticatedPayload(input: unknown): Record<string, unknown> {
  const payload = asObject(input);
  const {
    scope: _ignoredScope,
    actor: _ignoredActor,
    actorUserId: _ignoredActorUserId,
    ...safePayload
  } = payload;
  return safePayload;
}

function buildScopeFromSession(ctx: ApiContext) {
  if (!ctx.session) {
    throw new ApiError("Nao autenticado.", "UNAUTHORIZED");
  }

  const isGlobalView = GLOBAL_SCOPE_ROLES.has(ctx.session.role);
  return {
    isGlobalView,
    companyIds: isGlobalView ? [] : (ctx.session.companyIds ?? []),
  };
}

function buildActorFromSession(ctx: ApiContext) {
  if (!ctx.session) {
    throw new ApiError("Nao autenticado.", "UNAUTHORIZED");
  }

  return {
    userId: ctx.session.userId,
    role: ctx.session.role,
    name: null,
    email: null,
  };
}

export const remoteRouter = createRouter({
  discover: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(processDiscoverInputSchema, input.payload);
      try {
        return await createRemoteService(ctx).processDiscover(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  bootstrap: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(processBootstrapInputSchema, input.payload);
      try {
        return await createRemoteService(ctx).processBootstrap(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  sync: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(processSyncInputSchema, input.payload);

      try {
        return await createRemoteService(ctx).processSync(payload);
      } catch (error) {
        if (error instanceof Error && error.message === "AGENT_TOKEN_EXPIRED") {
          await revokeExpiredSyncAgentToken(payload.agentToken);
        }
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  ack: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(processAckInputSchema, input.payload);
      try {
        return await createRemoteService(ctx).processAck(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  sessionsList: defineQuery<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(listSessionsInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).listSessions(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  sessionsCreate: defineMutation<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(createSessionInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
        actor: buildActorFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).createSession(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  sessionsStart: defineMutation<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(startSessionInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
        actor: buildActorFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).startSession(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  sessionsStop: defineMutation<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(stopSessionInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
        actor: buildActorFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).stopSession(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  linkDiscoveredHost: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(linkDiscoveredHostInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).linkDiscoveredHost(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  hostsCreate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(createHostInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).createHost(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  hostsUpdate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(updateHostInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).updateHost(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  hostsDelete: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(deleteHostInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).deleteHost(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  hostsRotateAgentToken: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(hostAgentTokenInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).rotateHostAgentToken(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  hostsRevokeAgentToken: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(hostAgentTokenInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).revokeHostAgentToken(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  hostsRelinkSysproUpdate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(relinkHostSysproUpdateInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).relinkHostSysproUpdate(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  addressBookList: defineQuery<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(listAddressBookInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        scope: buildScopeFromSession(ctx),
      });

      try {
        return await createRemoteService(ctx).listAddressBook(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  addressBookCredentialsList: defineQuery<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(listAddressBookCredentialsInputSchema, input.payload);

      try {
        return await createRemoteService(ctx).listAddressBookCredentials(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  addressBookCredentialsCreate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(createAddressBookCredentialInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        actorUserId: buildActorFromSession(ctx).userId,
      });

      try {
        return await createRemoteService(ctx).createAddressBookCredential(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  addressBookCredentialsRotate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(rotateAddressBookCredentialInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        actorUserId: buildActorFromSession(ctx).userId,
      });

      try {
        return await createRemoteService(ctx).rotateAddressBookCredential(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),

  addressBookCredentialsRevoke: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ ctx, input }) => {
      const payload = parseOrThrow(revokeAddressBookCredentialInputSchema, {
        ...sanitizeAuthenticatedPayload(input.payload),
        actorUserId: buildActorFromSession(ctx).userId,
      });

      try {
        return await createRemoteService(ctx).revokeAddressBookCredential(payload);
      } catch (error) {
        mapRemoteErrorToApiError(error);
      }
    },
  }),
});

