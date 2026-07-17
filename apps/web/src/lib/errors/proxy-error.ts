type UnknownRecord = Record<string, unknown>;

export type ProxyErrorDetails = {
  message: string;
  name: string | null;
  code: string | null;
  causeMessage: string | null;
  causeName: string | null;
  causeCode: string | null;
  syscall: string | null;
  address: string | null;
  port: number | null;
  stackTop: string | null;
};

export function describeProxyError(error: unknown): ProxyErrorDetails {
  const topLevel = asRecord(error);
  const cause = asRecord(topLevel?.cause);
  const stack = typeof topLevel?.stack === "string" ? topLevel.stack.trim() : "";

  return {
    message: readMessage(error, topLevel),
    name: readString(topLevel?.name),
    code: readString(topLevel?.code),
    causeMessage: readMessage(topLevel?.cause, cause),
    causeName: readString(cause?.name),
    causeCode: readString(cause?.code),
    syscall: readString(cause?.syscall),
    address: readString(cause?.address),
    port: readNumber(cause?.port),
    stackTop: stack ? stack.split("\n")[0] ?? null : null,
  };
}

function readMessage(value: unknown, record: UnknownRecord | null): string {
  if (typeof record?.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  if (value instanceof Error && value.message.trim()) {
    return value.message.trim();
  }
  return "Unknown proxy error";
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
