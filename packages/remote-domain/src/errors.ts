import { ZodError } from "zod";

export type RemoteDomainHttpError = {
  code: string;
  message: string;
  httpStatus: number;
  data?: unknown;
};

const REMOTE_DOMAIN_ERROR_MAP: Record<string, Omit<RemoteDomainHttpError, "data">> = {
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    message: "Payload invalido.",
    httpStatus: 400,
  },
  DISCOVERY_TOKEN_NOT_CONFIGURED: {
    code: "DISCOVERY_TOKEN_NOT_CONFIGURED",
    message: "REMOTE_DISCOVERY_TOKEN nao configurado.",
    httpStatus: 503,
  },
  DISCOVERY_TOKEN_INVALID: {
    code: "DISCOVERY_TOKEN_INVALID",
    message: "Token de descoberta invalido.",
    httpStatus: 403,
  },
  DISCOVERY_ID_OR_MACHINE_REQUIRED: {
    code: "DISCOVERY_ID_OR_MACHINE_REQUIRED",
    message: "machineName ou rustdeskId e obrigatorio.",
    httpStatus: 400,
  },
  INSTALL_TOKEN_INVALID: {
    code: "INSTALL_TOKEN_INVALID",
    message: "Token de instalacao invalido.",
    httpStatus: 404,
  },
  AGENT_TOKEN_INVALID: {
    code: "AGENT_TOKEN_INVALID",
    message: "agentToken invalido ou expirado.",
    httpStatus: 401,
  },
  AGENT_TOKEN_EXPIRED: {
    code: "AGENT_TOKEN_EXPIRED",
    message: "agentToken expirado.",
    httpStatus: 401,
  },
  ACK_REASON_CODE_REQUIRED: {
    code: "ACK_REASON_CODE_REQUIRED",
    message: "reasonCode e obrigatorio quando status=FAILED.",
    httpStatus: 400,
  },
  ACK_REASON_CODE_INVALID: {
    code: "ACK_REASON_CODE_INVALID",
    message: "reasonCode invalido para status=FAILED.",
    httpStatus: 400,
  },
  COMMAND_NOT_FOUND: {
    code: "COMMAND_NOT_FOUND",
    message: "Comando nao encontrado para este host.",
    httpStatus: 404,
  },
  SESSION_CREATE_FORBIDDEN: {
    code: "SESSION_CREATE_FORBIDDEN",
    message: "Sem permissao para abrir sessao.",
    httpStatus: 403,
  },
  SESSION_COMPANY_OUT_OF_SCOPE: {
    code: "SESSION_COMPANY_OUT_OF_SCOPE",
    message: "Empresa fora do escopo do usuario.",
    httpStatus: 403,
  },
  SESSION_HOST_NOT_FOUND: {
    code: "SESSION_HOST_NOT_FOUND",
    message: "Host remoto nao encontrado para a empresa.",
    httpStatus: 404,
  },
  SESSION_HOST_MISCONFIGURED: {
    code: "SESSION_HOST_MISCONFIGURED",
    message: "Host ativo sem ID RustDesk configurado.",
    httpStatus: 409,
  },
  SESSION_DUPLICATE_OPEN: {
    code: "SESSION_DUPLICATE_OPEN",
    message: "Ja existe sessao aberta para este ticket e host.",
    httpStatus: 409,
  },
  SESSION_NOT_FOUND: {
    code: "SESSION_NOT_FOUND",
    message: "Sessao remota nao encontrada.",
    httpStatus: 404,
  },
  SESSION_START_INVALID_STATUS: {
    code: "SESSION_START_INVALID_STATUS",
    message: "Sessao nao pode ser iniciada no status atual.",
    httpStatus: 409,
  },
  SESSION_START_CONCURRENT: {
    code: "SESSION_START_CONCURRENT",
    message: "Ja existe sessao STARTED neste host.",
    httpStatus: 409,
  },
  SESSION_STOP_INVALID_STATUS: {
    code: "SESSION_STOP_INVALID_STATUS",
    message: "Sessao nao pode ser encerrada no status atual.",
    httpStatus: 409,
  },
  HOST_COMPANY_OUT_OF_SCOPE: {
    code: "HOST_COMPANY_OUT_OF_SCOPE",
    message: "Empresa fora do escopo remoto do usuario.",
    httpStatus: 403,
  },
  HOST_COMPANY_NOT_FOUND: {
    code: "HOST_COMPANY_NOT_FOUND",
    message: "Empresa nao encontrada.",
    httpStatus: 404,
  },
  DISCOVERED_HOST_NOT_FOUND: {
    code: "DISCOVERED_HOST_NOT_FOUND",
    message: "Maquina descoberta nao encontrada.",
    httpStatus: 404,
  },
  HOST_AGENT_EXTERNAL_ID_INVALID: {
    code: "HOST_AGENT_EXTERNAL_ID_INVALID",
    message: "RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos.",
    httpStatus: 400,
  },
  HOST_AGENT_EXTERNAL_ID_CONFLICT: {
    code: "HOST_AGENT_EXTERNAL_ID_CONFLICT",
    message: "Ja existe host remoto com este RustDesk ID.",
    httpStatus: 409,
  },
  HOST_NOT_FOUND: {
    code: "HOST_NOT_FOUND",
    message: "Host remoto nao encontrado.",
    httpStatus: 404,
  },
  HOST_DELETE_HAS_ACTIVE_SESSION: {
    code: "HOST_DELETE_HAS_ACTIVE_SESSION",
    message: "Nao e possivel excluir host com sessao ativa.",
    httpStatus: 409,
  },
  HOST_AGENT_TOKEN_NOT_ACTIVE: {
    code: "HOST_AGENT_TOKEN_NOT_ACTIVE",
    message: "Host nao possui agentToken ativo.",
    httpStatus: 409,
  },
  SYSPRO_UPDATE_NOT_FOUND: {
    code: "SYSPRO_UPDATE_NOT_FOUND",
    message: "Instalacao Syspro nao encontrada para este host.",
    httpStatus: 404,
  },
  ADDRESS_BOOK_COMPANY_REQUIRED: {
    code: "ADDRESS_BOOK_COMPANY_REQUIRED",
    message: "Selecione a empresa para credencial segmentada.",
    httpStatus: 400,
  },
  ADDRESS_BOOK_COMPANY_NOT_FOUND: {
    code: "ADDRESS_BOOK_COMPANY_NOT_FOUND",
    message: "Empresa nao encontrada para esta credencial.",
    httpStatus: 404,
  },
  ADDRESS_BOOK_INTEGRATION_KEY_INVALID: {
    code: "ADDRESS_BOOK_INTEGRATION_KEY_INVALID",
    message: "Integration key invalida.",
    httpStatus: 400,
  },
  ADDRESS_BOOK_CREDENTIAL_NOT_FOUND: {
    code: "ADDRESS_BOOK_CREDENTIAL_NOT_FOUND",
    message: "Credencial de address book nao encontrada.",
    httpStatus: 404,
  },
};

export function mapRemoteDomainError(
  error: unknown,
  options?: {
    validationMessage?: string;
    defaultMessage?: string;
  },
): RemoteDomainHttpError {
  if (error instanceof ZodError) {
    return {
      ...REMOTE_DOMAIN_ERROR_MAP.VALIDATION_ERROR,
      message: options?.validationMessage ?? REMOTE_DOMAIN_ERROR_MAP.VALIDATION_ERROR.message,
    };
  }

  if (error instanceof Error) {
    const mapped = REMOTE_DOMAIN_ERROR_MAP[error.message];
    if (mapped) {
      const withData: RemoteDomainHttpError = { ...mapped };
      const data = (error as Error & { data?: unknown }).data;
      if (data !== undefined) withData.data = data;
      return withData;
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: options?.defaultMessage ?? "Falha inesperada.",
    httpStatus: 500,
  };
}

