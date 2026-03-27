"use client";

type RemoteApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
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

  return baseMessage;
}

export async function parseRemoteApiResponse<T>(
  response: Response,
  fallbackErrorMessage: string,
): Promise<{ data: T; message?: string; code?: string; httpStatus?: number }> {
  const payload = (await response.json().catch(() => null)) as RemoteApiEnvelope<T> | null;
  const code = payload?.code;
  const httpStatus = payload?.httpStatus ?? response.status;
  const rawMessage = payload?.message ?? payload?.error ?? fallbackErrorMessage;
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

export function getRemoteApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof RemoteApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
