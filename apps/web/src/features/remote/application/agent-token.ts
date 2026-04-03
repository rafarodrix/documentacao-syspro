const DEFAULT_AGENT_TOKEN_TTL_DAYS = 30;

export function getRemoteAgentTokenTtlDays() {
  const rawValue = process.env.REMOTE_AGENT_TOKEN_TTL_DAYS?.trim();
  const parsed = rawValue ? Number(rawValue) : NaN;

  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 365) {
    return Math.floor(parsed);
  }

  return DEFAULT_AGENT_TOKEN_TTL_DAYS;
}

export function getRemoteAgentTokenExpiresAt(issuedAt: Date | null | undefined) {
  if (!issuedAt) return null;

  const expiresAt = new Date(issuedAt);
  expiresAt.setDate(expiresAt.getDate() + getRemoteAgentTokenTtlDays());
  return expiresAt;
}

export function isRemoteAgentTokenExpired(issuedAt: Date | null | undefined, now = new Date()) {
  const expiresAt = getRemoteAgentTokenExpiresAt(issuedAt);
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}
