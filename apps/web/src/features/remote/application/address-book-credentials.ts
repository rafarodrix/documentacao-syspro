import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADDRESS_BOOK_TOKEN_PREFIX = "trlabk_";

export function hashAddressBookToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildAddressBookToken() {
  const raw = randomBytes(24).toString("base64url");
  const token = `${ADDRESS_BOOK_TOKEN_PREFIX}${raw}`;
  return {
    token,
    tokenHash: hashAddressBookToken(token),
    tokenPreview: `${token.slice(0, 14)}...`,
  };
}

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice("bearer ".length).trim();
  return token || null;
}

export async function resolveAddressBookCredentialFromRequest(request: Request) {
  const token = extractBearerToken(request);
  if (!token) return null;

  const tokenHash = hashAddressBookToken(token);
  const now = new Date();
  const credential = await prisma.remoteAddressBookCredential.findFirst({
    where: {
      tokenHash,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      scope: true,
      companyId: true,
    },
  });

  if (!credential) return null;

  await prisma.remoteAddressBookCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: now },
  });

  return credential;
}
