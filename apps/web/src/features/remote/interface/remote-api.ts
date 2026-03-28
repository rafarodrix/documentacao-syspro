"use client";

type RemoteApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  code?: string;
  httpStatus?: number;
};

export class RemoteApiClientError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toActionableMessage(baseMessage: string, httpStatus?: number, code?: string) {
  if (httpStatus === 401 || code === "UNAUTHORIZED") {
    return "Sessao expirada ou invalida. Entre novamente para continuar.";
  }

  if (httpStatus === 403 || code === "FORBIDDEN") {
    return "Sem permissao para esta operacao no modulo remoto.";
  }

  if (httpStatus === 429 || code === "RATE_LIMITED") {
    return "Limite de requisicoes atingido. Aguarde alguns segundos e tente novamente.";
  }

  if (httpStatus === 409) {
    if (code === "HOST_DELETE_HAS_ACTIVE_SESSION") {
      return "Nao e possivel excluir host com sessao ativa. Encerre a sessao e tente novamente.";
    }
    if (code === "SESSION_DUPLICATE_OPEN") {
      return "Ja existe sessao aberta para este ticket e host.";
    }
    if (code === "SESSION_START_CONCURRENT") {
      return "Ja existe sessao em andamento neste host. Encerre a sessao atual antes de iniciar outra.";
    }
    return "Conflito de estado no recurso remoto. Atualize a tela e tente novamente.";
  }

  return baseMessage;
}

export async function parseRemoteApiResponse<T>(
  response: Response,
  fallbackErrorMessage = "Falha ao concluir a operacao remota.",
): Promise<{ data: T; message?: string; code?: string; httpStatus?: number }> {
  const payload = (await response.json().catch(() => null)) as RemoteApiEnvelope<T> | null;
  const code = payload?.code;
  const httpStatus = payload?.httpStatus ?? response.status;
  const rawMessage = payload?.message ?? fallbackErrorMessage;
  const message = toActionableMessage(rawMessage, httpStatus, code);

  if (!response.ok) {
    throw new RemoteApiClientError(message, code, httpStatus);
  }

  if (isObject(payload) && "data" in payload) {
    return {
      data: payload.data as T,
      message: payload.message,
      code,
      httpStatus,
    };
  }

  return {
    data: (payload as T) ?? (null as T),
    message: payload?.message,
    code,
    httpStatus,
  };
}

export function parseRemoteMutationResponse<T>(
  response: Response,
): Promise<{ data: T; message?: string; code?: string; httpStatus?: number }> {
  return parseRemoteApiResponse<T>(response, "Falha ao concluir a operacao remota.");
}

type RemoteRequestInput = {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

function buildRemoteRequestInit(input: RemoteRequestInput): RequestInit {
  const hasBody = typeof input.body !== "undefined";
  return {
    method: input.method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(input.headers ?? {}),
    },
    body: hasBody ? JSON.stringify(input.body) : undefined,
    signal: input.signal,
  };
}

export async function requestRemoteMutation<T = Record<string, unknown>>(
  input: RemoteRequestInput,
): Promise<{ data: T; message?: string; code?: string; httpStatus?: number }> {
  const response = await fetch(input.url, buildRemoteRequestInit(input));
  return parseRemoteMutationResponse<T>(response);
}

export async function requestRemoteQuery<T>(
  input: Omit<RemoteRequestInput, "body">,
): Promise<{ data: T; message?: string; code?: string; httpStatus?: number }> {
  const response = await fetch(input.url, buildRemoteRequestInit(input));
  return parseRemoteApiResponse<T>(response);
}

export function getRemoteApiErrorMessage(
  error: unknown,
  fallback = "Falha ao concluir a operacao remota.",
) {
  if (error instanceof RemoteApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (/failed to fetch|networkerror|load failed|fetch/i.test(error.message)) {
      return "Falha de comunicacao com o modulo remoto. Verifique a conexao e tente novamente.";
    }
    if (error.message) {
      return error.message;
    }
  }

  return fallback;
}
