import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@dosc-syspro/database";
import { resolveRustDeskAlias } from "./remote-domain-ports";
import type {
  ListAddressBookCredentialsOutput,
  ListAddressBookOutput,
  RemoteAddressBookPort,
} from "@dosc-syspro/remote-domain";

const ADDRESS_BOOK_TOKEN_PREFIX = "trlabk_";

function buildAddressBookToken() {
  const raw = randomBytes(24).toString("base64url");
  const token = `${ADDRESS_BOOK_TOKEN_PREFIX}${raw}`;
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  return {
    token,
    tokenHash,
    tokenPreview: `${token.slice(0, 14)}...`,
  };
}

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function normalizeIntegrationKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function createRemoteAddressBookPort(): RemoteAddressBookPort {
  return {
    async listAddressBook(input): Promise<ListAddressBookOutput> {
      const hosts = await prisma.remoteHost.findMany({
        where: buildScopedWhere(input.scope.companyIds, input.scope.isGlobalView),
        include: {
          company: { select: { nomeFantasia: true, razaoSocial: true } },
          sysproUpdates: { select: { companyLabel: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 500,
      });

      const items = hosts
        .filter((host) => !!host.agentExternalId)
        .map((host) => {
          const alias = resolveRustDeskAlias({
            hostName: host.name,
            machineName: host.machineName,
            companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
          });
          const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
          const tags = Array.from(
            new Set(
              [
                `Empresa: ${companyName}`,
                host.environment ? `Ambiente: ${host.environment}` : null,
                host.provider ? `Provider: ${host.provider}` : null,
                ...host.sysproUpdates.map((item) => `Instalacao: ${item.companyLabel}`),
              ].filter((entry): entry is string => !!entry),
            ),
          );

          return {
            id: host.agentExternalId,
            alias,
            hostname: host.machineName,
            tags,
            hash: host.updatedAt.getTime().toString(),
            portalHostId: host.id,
            companyId: host.companyId,
            lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
          };
        });

      return { items, total: items.length };
    },

    async listAddressBookCredentials(_input): Promise<ListAddressBookCredentialsOutput> {
      const credentials = await prisma.remoteAddressBookCredential.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 100,
        include: {
          company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          rotatedByUser: { select: { id: true, name: true, email: true } },
          revokedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      return {
        credentials: credentials.map((item) => ({
          id: item.id,
          label: item.label,
          integrationKey: item.integrationKey,
          scope: item.scope,
          status: item.status,
          companyId: item.companyId,
          companyName: item.company ? item.company.nomeFantasia ?? item.company.razaoSocial : null,
          tokenPreview: item.tokenPreview,
          expiresAt: item.expiresAt?.toISOString() ?? null,
          lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
          revokedAt: item.revokedAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          createdBy: item.createdByUser ? { id: item.createdByUser.id, name: item.createdByUser.name, email: item.createdByUser.email } : null,
          rotatedBy: item.rotatedByUser ? { id: item.rotatedByUser.id, name: item.rotatedByUser.name, email: item.rotatedByUser.email } : null,
          revokedBy: item.revokedByUser ? { id: item.revokedByUser.id, name: item.revokedByUser.name, email: item.revokedByUser.email } : null,
        })),
      };
    },

    async createAddressBookCredential(input) {
      const scope = input.scope === "COMPANY" ? "COMPANY" : "GLOBAL";
      const companyId = input.companyId?.trim() || null;

      if (scope === "COMPANY" && !companyId) {
        throw new Error("ADDRESS_BOOK_COMPANY_REQUIRED");
      }

      if (scope === "COMPANY" && companyId) {
        const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null }, select: { id: true } });
        if (!company) throw new Error("ADDRESS_BOOK_COMPANY_NOT_FOUND");
      }

      const expiresInDaysRaw = Number(input.expiresInDays ?? 0);
      const expiresInDays = Number.isFinite(expiresInDaysRaw) && expiresInDaysRaw > 0 ? Math.floor(expiresInDaysRaw) : null;
      const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;
      const integrationKeyBase = input.integrationKey?.trim() ? input.integrationKey : input.label;
      const integrationKey = normalizeIntegrationKey(integrationKeyBase);
      if (!integrationKey) throw new Error("ADDRESS_BOOK_INTEGRATION_KEY_INVALID");

      const { token, tokenHash, tokenPreview } = buildAddressBookToken();
      const created = await prisma.remoteAddressBookCredential.create({
        data: {
          label: input.label,
          integrationKey,
          scope,
          companyId: scope === "COMPANY" ? companyId : null,
          tokenHash,
          tokenPreview,
          expiresAt,
          createdByUserId: input.actorUserId,
        },
      });

      return {
        credential: {
          id: created.id,
          token,
          tokenPreview: created.tokenPreview,
          scope: created.scope,
          companyId: created.companyId,
          expiresAt: created.expiresAt?.toISOString() ?? null,
        },
      };
    },

    async rotateAddressBookCredential(input) {
      const current = await prisma.remoteAddressBookCredential.findUnique({ where: { id: input.credentialId } });
      if (!current) throw new Error("ADDRESS_BOOK_CREDENTIAL_NOT_FOUND");

      const now = new Date();
      const { token, tokenHash, tokenPreview } = buildAddressBookToken();
      const rotated = await prisma.$transaction(async (tx) => {
        await tx.remoteAddressBookCredential.update({
          where: { id: current.id },
          data: { status: "REVOKED", revokedAt: now, rotatedByUserId: input.actorUserId },
        });

        return tx.remoteAddressBookCredential.create({
          data: {
            label: current.label,
            integrationKey: current.integrationKey,
            scope: current.scope,
            companyId: current.companyId,
            tokenHash,
            tokenPreview,
            expiresAt: current.expiresAt,
            rotatedFromId: current.id,
            createdByUserId: input.actorUserId,
          },
        });
      });

      return {
        credential: {
          id: rotated.id,
          token,
          tokenPreview: rotated.tokenPreview,
          scope: rotated.scope,
          companyId: rotated.companyId,
          expiresAt: rotated.expiresAt?.toISOString() ?? null,
        },
      };
    },

    async revokeAddressBookCredential(input) {
      const credential = await prisma.remoteAddressBookCredential.findUnique({
        where: { id: input.credentialId },
        select: { id: true, status: true },
      });

      if (!credential) throw new Error("ADDRESS_BOOK_CREDENTIAL_NOT_FOUND");

      if (credential.status === "REVOKED") {
        return { revoked: true, alreadyRevoked: true, message: "Credencial ja estava revogada." };
      }

      await prisma.remoteAddressBookCredential.update({
        where: { id: credential.id },
        data: { status: "REVOKED", revokedAt: new Date(), revokedByUserId: input.actorUserId },
      });

      return { revoked: true, alreadyRevoked: false, message: "Credencial revogada." };
    },
  };
}
