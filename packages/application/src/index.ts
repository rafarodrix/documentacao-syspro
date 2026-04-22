export { createApiContext } from "./context";
export { ApiError, callProcedure, createRouter, defineMutation, defineQuery, mergeRouters } from "./router";
export { appRouter } from "./routers/app";
export { ticketsRouter } from "./routers/tickets";
export { settingsRouter } from "./routers/settings";
export { contractsRouter } from "./routers/contracts";
export { taxRouter } from "./routers/tax";
export { remoteRouter } from "./routers/remote";
export { handleActionError } from "./lib/errors/action-error-handler";
export {
  createLogger,
  createRequestLogger,
  getCorrelationIdFromRequest,
} from "./lib/observability/logger";
export { consumeActionRateLimit } from "./lib/security/action-rate-limit";
export {
  computeHmacSha256Hex,
  extractSecretToken,
  isValidHmacSignature,
  isValidSecretToken,
  safeTimingEqual,
} from "./lib/security/request-auth";
export type { AppRouter } from "./routers/app";
export type { ApiContext, ApiLogger, AuthLikeSession, ProcedureDefinition, RouterDefinition } from "./lib/contracts";
export type { ActionErrorResponse, HandleActionErrorOptions } from "./lib/errors/action-error-handler";
export type { LogFields, LogLevel, RequestLoggerLike, RequestLoggerOptions } from "./lib/observability/logger";
export type { RateLimitOptions, RateLimitWindow } from "./lib/security/action-rate-limit";
export type { RequestLike, SecretTokenOptions } from "./lib/security/request-auth";
export { configureRemoteSessionTicketNoteHandler, configureRemoteSessionWhatsAppAlertHandler } from "@dosc-syspro/remote-infra";
export { readEvolutionConfig, hasEvolutionApiCredentials } from "./services/evolution-config";
export { WhatsAppService } from "./services/whatsapp-service";
