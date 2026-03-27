import type { ApiContext, ApiLogger, AuthLikeSession } from "./lib/contracts";

const noopLogger: ApiLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function createApiContext(
  input?: Partial<ApiContext> & {
    session?: AuthLikeSession;
    logger?: ApiLogger;
  },
): ApiContext {
  return {
    requestId: input?.requestId ?? crypto.randomUUID(),
    session: input?.session ?? null,
    requestIp: input?.requestIp ?? null,
    userAgent: input?.userAgent ?? null,
    logger: input?.logger ?? noopLogger,
  };
}
