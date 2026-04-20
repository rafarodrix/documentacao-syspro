export type { Ticket, TicketPriority, TicketStatus } from "./entities/ticket.entity";
export type { Release } from "./entities/release.entity";
export {
  CONTRACT_BLOCK_MARKER,
  CONTRACT_BLOCK_REASONS,
  CONTRACT_BLOCK_REASON_LABEL,
  serializeContractBlockReason,
  parseContractBlockReason,
} from "./config/contract-blocking";
export type { ContractBlockReason } from "./config/contract-blocking";
export {
  APP_ROLES,
  SYSTEM_ROLES,
  CADASTRO_MANAGER_ROLES,
  CADASTROS_ROUTE_RULES,
  DOCS_ROUTE_RULES,
  SIDEBAR_ROLE_RULES,
  hasAllowedRole,
} from "./config/route-access";
export type { AppRole } from "./config/route-access";
export { ROLE_LABELS, getRoleLabel } from "./config/role-labels";
export { getTicketStateMatrix } from "./config/ticket-state-matrix";
export {
  TICKET_QUEUE_KEYS,
  TICKET_STATUS_GROUPS,
  OPEN_STATE_IDS,
  PENDING_STATE_IDS,
  CLOSED_STATE_IDS,
  OPERATIONAL_STATE_IDS,
  TICKET_STATUS_QUERY_TERMS,
  getTicketStatusGroup,
  isTicketStatusGroup,
  getStateIdsForStatusGroup,
} from "./config/tickets-workflow";
export type { QueueKey, TicketStatusGroup } from "./config/tickets-workflow";
export { computeTicketSla } from "./services/ticket-sla.service";
export type { TicketSlaMeta } from "./services/ticket-sla.service";
export {
  buildReleaseFromTicket,
  inferReleaseTypeFromCategory,
  inferReleaseTypeFromMetadata,
  normalizeReleaseType,
  readReleaseMetadataString,
} from "./services/release-projection.service";
export type { ReleaseKind, ReleaseProjectionSource } from "./services/release-projection.service";
