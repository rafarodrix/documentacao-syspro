import { ApiError, appRouter, callProcedure, createApiContext } from "@dosc-syspro/api";
import { mapRemoteDomainError } from "@dosc-syspro/remote-domain";

type JsonObject = Record<string, unknown>;

function json(data: JsonObject, init?: ResponseInit) {
  return Response.json(data, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

function getRequestId(request: Request) {
  return request.headers.get("x-request-id")?.trim() || undefined;
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.trim();
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || null;
}

function getSessionFromHeaders(request: Request) {
  const userId = request.headers.get("x-user-id")?.trim();
  const role = request.headers.get("x-user-role")?.trim();
  const companyIdsHeader = request.headers.get("x-company-ids")?.trim();

  if (!userId || !role) {
    return null;
  }

  return {
    userId,
    role,
    companyIds: companyIdsHeader
      ? companyIdsHeader
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined,
  };
}

async function parseInput(request: Request) {
  if (request.method !== "POST") return undefined;
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return undefined;
  const body = (await request.json()) as JsonObject;
  return "input" in body ? body.input : body;
}

function getStatusCode(error: ApiError) {
  switch (error.code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "BAD_REQUEST":
      return 400;
    default:
      return 500;
  }
}

function getApiCode(error: ApiError) {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "UNAUTHORIZED";
    case "FORBIDDEN":
      return "FORBIDDEN";
    case "BAD_REQUEST":
      return "BAD_REQUEST";
    default:
      return "INTERNAL_ERROR";
  }
}

function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; message?: unknown };
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

export async function handleApiRequest(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return json({
      ok: true,
      service: "@dosc-syspro/app-api",
      transport: "http",
    });
  }

  const match = url.pathname.match(/^\/rpc\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return json({ ok: false, error: "Route not found." }, { status: 404 });
  }

  const [, namespace, procedure] = match;
  const router = appRouter[namespace as keyof typeof appRouter];

  if (!router) {
    return json({ ok: false, error: `Namespace not found: ${namespace}` }, { status: 404 });
  }

  const ctx = createApiContext({
    requestId: getRequestId(request),
    session: getSessionFromHeaders(request),
    requestIp: getRequestIp(request),
    userAgent: request.headers.get("user-agent")?.trim() || null,
    logger: {
      info: (event: string, meta?: Record<string, unknown>) => console.info(event, meta),
      warn: (event: string, meta?: Record<string, unknown>) => console.warn(event, meta),
      error: (event: string, meta?: Record<string, unknown>) => console.error(event, meta),
    },
  });

  try {
    const input = await parseInput(request);
    const data = await callProcedure({
      ctx,
      namespace,
      router,
      procedure,
      input,
    });

    return json({
      ok: true,
      requestId: ctx.requestId,
      data,
    });
  } catch (error) {
    if (isApiError(error)) {
      const httpStatus = getStatusCode(error);
      const code = getApiCode(error);
      return json(
        {
          ok: false,
          requestId: ctx.requestId,
          error: error.message,
          message: error.message,
          code,
          httpStatus,
        },
        { status: httpStatus },
      );
    }

    const mapped = mapRemoteDomainError(error, {
      defaultMessage: "Unhandled error.",
    });

    console.error("api.unhandled", { requestId: ctx.requestId, error });
    return json(
      {
        ok: false,
        requestId: ctx.requestId,
        error: mapped.message,
        message: mapped.message,
        code: mapped.code,
        httpStatus: mapped.httpStatus,
        ...(mapped.data !== undefined ? { data: mapped.data } : {}),
      },
      { status: mapped.httpStatus },
    );
  }
}

