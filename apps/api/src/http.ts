import {
  ApiError,
  appRouter,
  callProcedure,
  configureRemoteSessionTicketNoteHandler,
  createApiContext,
} from "@dosc-syspro/api";
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

function getZammadConfig() {
  const baseUrl = process.env.ZAMMAD_URL?.trim() ?? "";
  const token = process.env.ZAMMAD_TOKEN?.trim() ?? "";
  const authScheme = process.env.ZAMMAD_AUTH_SCHEME?.trim().toLowerCase() ?? "token";

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token,
    authScheme,
  };
}

function buildZammadAuthorizationHeader(token: string, authScheme: string) {
  const normalized = token.trim();
  const lowered = normalized.toLowerCase();

  if (lowered.startsWith("bearer ") || lowered.startsWith("token ")) {
    return normalized;
  }

  if (authScheme === "bearer") {
    return `Bearer ${normalized}`;
  }

  return `Token token=${normalized}`;
}

async function addInternalTicketNoteToZammad(input: { ticketId: string; body: string }) {
  const { baseUrl, token, authScheme } = getZammadConfig();
  if (!baseUrl || !token) {
    return;
  }

  const response = await fetch(`${baseUrl}/api/v1/ticket_articles`, {
    method: "POST",
    headers: {
      Authorization: buildZammadAuthorizationHeader(token, authScheme),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticket_id: input.ticketId,
      body: input.body,
      type: "note",
      content_type: "text/html",
      internal: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`ZAMMAD_INTERNAL_NOTE_FAILED_${response.status}`);
  }
}

configureRemoteSessionTicketNoteHandler(addInternalTicketNoteToZammad);
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

type RemoteMappedError = {
  code: string;
  message: string;
  httpStatus: number;
  data?: unknown;
};

function extractRemoteMappedError(error: ApiError): RemoteMappedError | null {
  if (!error.cause || typeof error.cause !== "object") return null;

  const cause = error.cause as { remote?: unknown };
  if (!cause.remote || typeof cause.remote !== "object") return null;

  const remote = cause.remote as {
    code?: unknown;
    message?: unknown;
    httpStatus?: unknown;
    data?: unknown;
  };

  if (typeof remote.code !== "string") return null;
  if (typeof remote.message !== "string") return null;
  if (typeof remote.httpStatus !== "number") return null;

  return {
    code: remote.code,
    message: remote.message,
    httpStatus: remote.httpStatus,
    ...(remote.data !== undefined ? { data: remote.data } : {}),
  };
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
      success: true,
      service: "@dosc-syspro/app-api",
      transport: "http",
    });
  }

  const match = url.pathname.match(/^\/rpc\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return json({ ok: false, success: false, error: "Route not found." }, { status: 404 });
  }

  const [, namespace, procedure] = match;
  const router = appRouter[namespace as keyof typeof appRouter];

  if (!router) {
    return json({ ok: false, success: false, error: `Namespace not found: ${namespace}` }, { status: 404 });
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
      success: true,
      requestId: ctx.requestId,
      data,
    });
  } catch (error) {
    if (isApiError(error)) {
      const mappedRemote = extractRemoteMappedError(error);
      const httpStatus = mappedRemote?.httpStatus ?? getStatusCode(error);
      const code = mappedRemote?.code ?? getApiCode(error);
      const message = mappedRemote?.message ?? error.message;

      return json(
        {
          ok: false,
          success: false,
          requestId: ctx.requestId,
          error: message,
          message,
          code,
          httpStatus,
          ...(mappedRemote?.data !== undefined ? { data: mappedRemote.data } : {}),
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
        success: false,
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



