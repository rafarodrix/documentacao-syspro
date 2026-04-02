export type ActionErrorResponse = {
  success: false;
  message: string;
};

export type HandleActionErrorOptions = {
  defaultMessage?: string;
  notFoundMessage?: string;
  duplicateMessage?: string;
  duplicateFieldMessages?: Record<string, string>;
  logPrefix?: string;
};

type PrismaKnownLikeError = {
  code?: unknown;
  meta?: { target?: unknown } | null;
};

const DEFAULT_DUPLICATE_FIELD_MESSAGES: Record<string, string> = {
  email: "Este e-mail ja esta em uso.",
  cpf: "Este CPF ja esta cadastrado.",
  cnpj: "Este CNPJ ja esta cadastrado no sistema.",
};

function isPrismaKnownLikeError(error: unknown): error is PrismaKnownLikeError {
  if (!error || typeof error !== "object") return false;
  return "code" in error;
}

function toTargetList(target: unknown): string[] {
  if (Array.isArray(target)) return target.map((item) => String(item));
  if (typeof target === "string") return [target];
  return [];
}

export function handleActionError(error: unknown, options: HandleActionErrorOptions = {}): ActionErrorResponse {
  const {
    defaultMessage = "Erro interno no servidor.",
    notFoundMessage = "Registro nao encontrado.",
    duplicateMessage = "Registro duplicado.",
    duplicateFieldMessages = DEFAULT_DUPLICATE_FIELD_MESSAGES,
    logPrefix = "[Action Error]",
  } = options;

  console.error(logPrefix, error);

  if (isPrismaKnownLikeError(error)) {
    if (error.code === "P2002") {
      const target = toTargetList(error.meta?.target);
      for (const key of target) {
        if (duplicateFieldMessages[key]) {
          return { success: false, message: duplicateFieldMessages[key] };
        }
      }
      return { success: false, message: duplicateMessage };
    }

    if (error.code === "P2025") {
      return { success: false, message: notFoundMessage };
    }
  }

  if (error instanceof Error) {
    return { success: false, message: error.message || defaultMessage };
  }

  return { success: false, message: defaultMessage };
}
