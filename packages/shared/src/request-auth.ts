import crypto from "crypto";

type HeaderBag = {
  get(name: string): string | null;
};

export type RequestLike = {
  headers: HeaderBag;
  url: string;
};

export type SecretTokenOptions = {
  headerName: string;
  queryName?: string;
  allowBearer?: boolean;
};

export function safeTimingEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function extractSecretToken(request: RequestLike, options: SecretTokenOptions): string {
  const { headerName, queryName = "secret", allowBearer = false } = options;
  const fromHeader = request.headers.get(headerName) ?? "";
  if (fromHeader) return fromHeader;

  if (allowBearer) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
  }

  const url = new URL(request.url);
  return url.searchParams.get(queryName) ?? "";
}

export function isValidSecretToken(
  request: RequestLike,
  expectedSecret: string,
  options: SecretTokenOptions,
): boolean {
  const received = extractSecretToken(request, options);
  if (!received) return false;
  return safeTimingEqual(received, expectedSecret);
}

export function computeHmacSha256Hex(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function isValidHmacSignature(
  payload: string,
  providedSignature: string | null,
  secret: string,
): boolean {
  if (!providedSignature) return false;
  const normalized = providedSignature.trim().toLowerCase().replace(/^sha256=/, "");
  if (!normalized) return false;
  const expected = computeHmacSha256Hex(payload, secret);
  return safeTimingEqual(normalized, expected);
}
