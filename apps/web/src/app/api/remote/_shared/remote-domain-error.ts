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

export function toRemoteDomainErrorResponse(
  error: unknown,
  options?: {
    headers?: HeadersInit;
    validationMessage?: string;
    defaultMessage?: string;
  },
) {
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

