type RateLimitWindow = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  action: string;
  max: number;
  windowMs: number;
  userId?: string | null;
  ip?: string | null;
};

const globalStore = globalThis as unknown as {
  __actionRateLimitStore?: Map<string, RateLimitWindow>;
};

const rateLimitStore = globalStore.__actionRateLimitStore ?? new Map<string, RateLimitWindow>();
globalStore.__actionRateLimitStore = rateLimitStore;

function normalizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  return ip.split(",")[0]?.trim() || null;
}

function buildKey(action: string, userId?: string | null, ip?: string | null): string {
  if (userId) return `${action}:user:${userId}`;
  if (ip) return `${action}:ip:${ip}`;
  return `${action}:anonymous`;
}

function pruneExpired(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function consumeActionRateLimit(options: RateLimitOptions): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  pruneExpired(now);

  const key = buildKey(options.action, options.userId, normalizeIp(options.ip));
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

