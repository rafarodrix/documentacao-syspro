import crypto from "crypto";

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

type RequestLoggerOptions = {
  area?: string;
  feature?: string;
};

function normalizeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function writeStructuredLog(level: LogLevel, event: string, fields: LogFields) {
  const entry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...fields,
  };

  const message = JSON.stringify(entry);
  if (level === "error") {
    console.error(message);
    return;
  }

  if (level === "warn") {
    console.warn(message);
    return;
  }

  console.info(message);
}

export function createLogger(baseFields: LogFields = {}) {
  return {
    info(event: string, fields: LogFields = {}) {
      writeStructuredLog("info", event, { ...baseFields, ...fields });
    },
    warn(event: string, fields: LogFields = {}) {
      writeStructuredLog("warn", event, { ...baseFields, ...fields });
    },
    error(event: string, error?: unknown, fields: LogFields = {}) {
      writeStructuredLog("error", event, {
        ...baseFields,
        ...fields,
        error: normalizeError(error),
      });
    },
    child(fields: LogFields = {}) {
      return createLogger({ ...baseFields, ...fields });
    },
  };
}

export function getCorrelationIdFromRequest(request: Request): string {
  return (
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-request-id") ??
    crypto.randomUUID()
  );
}

export function createRequestLogger(request: Request, options: RequestLoggerOptions = {}) {
  const url = new URL(request.url);
  const correlationId = getCorrelationIdFromRequest(request);
  const ipHeader = request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip");
  const ip = ipHeader?.split(",")[0]?.trim() ?? null;

  const logger = createLogger({
    correlationId,
    method: request.method,
    path: url.pathname,
    ip,
    userAgent: request.headers.get("user-agent"),
    area: options.area,
    feature: options.feature,
  });

  return {
    correlationId,
    logger,
    responseHeaders: {
      "x-correlation-id": correlationId,
    },
  };
}
