const REQUESTED_TTL_MS = 30 * 60 * 1000;
const STARTED_TTL_MS = 8 * 60 * 60 * 1000;

export function buildRequestedSessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + REQUESTED_TTL_MS);
}

export function buildStartedSessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + STARTED_TTL_MS);
}

export function isSessionExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}
