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
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";

type ZodSchema<T> = z.ZodType<T>;

function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError("Payload invalido para rota remota.", "BAD_REQUEST", {
      issues: parsed.error.issues,
    });
  }

  return parsed.data;
}

export const remoteRouter = createRouter({
  discover: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ input }) => {
      const payload = parseOrThrow(processDiscoverInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "discover", input: payload };
    },
  }),
  bootstrap: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ input }) => {
      const payload = parseOrThrow(processBootstrapInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "bootstrap", input: payload };
    },
  }),
  sync: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ input }) => {
      const payload = parseOrThrow(processSyncInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "sync", input: payload };
    },
  }),
  ack: defineMutation<{ payload: unknown }, unknown>({
    auth: "public",
    handler: async ({ input }) => {
      const payload = parseOrThrow(processAckInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "ack", input: payload };
    },
  }),
  sessionsList: defineQuery<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => {
      const payload = parseOrThrow(listSessionsInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "sessionsList", input: payload };
    },
  }),
  sessionsCreate: defineMutation<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => {
      const payload = parseOrThrow(createSessionInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "sessionsCreate", input: payload };
    },
  }),
  sessionsStart: defineMutation<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => {
      const payload = parseOrThrow(startSessionInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "sessionsStart", input: payload };
    },
  }),
  sessionsStop: defineMutation<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => {
      const payload = parseOrThrow(stopSessionInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "sessionsStop", input: payload };
    },
  }),
  linkDiscoveredHost: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(linkDiscoveredHostInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "linkDiscoveredHost", input: payload };
    },
  }),
  hostsCreate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(createHostInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "hostsCreate", input: payload };
    },
  }),
  hostsUpdate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(updateHostInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "hostsUpdate", input: payload };
    },
  }),
  hostsDelete: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(deleteHostInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "hostsDelete", input: payload };
    },
  }),
  hostsRotateAgentToken: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(hostAgentTokenInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "hostsRotateAgentToken", input: payload };
    },
  }),
  hostsRevokeAgentToken: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(hostAgentTokenInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "hostsRevokeAgentToken", input: payload };
    },
  }),
  hostsRelinkSysproUpdate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(relinkHostSysproUpdateInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "hostsRelinkSysproUpdate", input: payload };
    },
  }),
  addressBookList: defineQuery<{ payload: unknown }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => {
      const payload = parseOrThrow(listAddressBookInputSchema, input.payload);
      return { status: "not-wired", router: "remote", procedure: "addressBookList", input: payload };
    },
  }),
  addressBookCredentialsList: defineQuery<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(listAddressBookCredentialsInputSchema, input.payload);
      return {
        status: "not-wired",
        router: "remote",
        procedure: "addressBookCredentialsList",
        input: payload,
      };
    },
  }),
  addressBookCredentialsCreate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(createAddressBookCredentialInputSchema, input.payload);
      return {
        status: "not-wired",
        router: "remote",
        procedure: "addressBookCredentialsCreate",
        input: payload,
      };
    },
  }),
  addressBookCredentialsRotate: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(rotateAddressBookCredentialInputSchema, input.payload);
      return {
        status: "not-wired",
        router: "remote",
        procedure: "addressBookCredentialsRotate",
        input: payload,
      };
    },
  }),
  addressBookCredentialsRevoke: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = parseOrThrow(revokeAddressBookCredentialInputSchema, input.payload);
      return {
        status: "not-wired",
        router: "remote",
        procedure: "addressBookCredentialsRevoke",
        input: payload,
      };
    },
  }),
});



