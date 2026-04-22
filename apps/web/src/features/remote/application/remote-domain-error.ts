import { NextResponse } from "next/server";
import { mapRemoteDomainError } from "@dosc-syspro/remote-domain";

type RemoteErrorResponseInput = {
  code: string;
  message: string;
  httpStatus: number;
  headers?: HeadersInit;
  data?: unknown;
};

export function remoteErrorResponse(input: RemoteErrorResponseInput) {
  return NextResponse.json(
    {
      success: false,
      error: input.message,
      message: input.message,
      code: input.code,
      httpStatus: input.httpStatus,
      ...(input.data !== undefined ? { data: input.data } : {}),
    },
    {
      status: input.httpStatus,
      headers: input.headers,
    },
  );
}

function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("Authentication failed against database server") ||
    error.message.includes("ECIRCUITBREAKER") ||
    error.message.includes("Error querying the database")
  );
}

export function toRemoteDomainErrorResponse(
  error: unknown,
  options?: {
    headers?: HeadersInit;
    validationMessage?: string;
    defaultMessage?: string;
  },
) {
  if (isDatabaseConnectionError(error)) {
    return remoteErrorResponse({
      code: "DATABASE_UNAVAILABLE",
      message: "Banco de dados indisponivel ou credenciais invalidas em producao.",
      httpStatus: 503,
      headers: options?.headers,
    });
  }

  const mapped = mapRemoteDomainError(error, {
    validationMessage: options?.validationMessage,
    defaultMessage: options?.defaultMessage,
  });

  return remoteErrorResponse({
    code: mapped.code,
    message: mapped.message,
    httpStatus: mapped.httpStatus,
    headers: options?.headers,
    data: mapped.data,
  });
}

export function mapRemoteDomainHttpError(
  error: unknown,
  options?: {
    validationMessage?: string;
    defaultMessage?: string;
  },
) {
  return mapRemoteDomainError(error, options);
}
