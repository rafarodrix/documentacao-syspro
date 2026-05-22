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
  ENTITY_INACTIVATION_MARKER,
  ENTITY_INACTIVATION_REASON_VALUES,
  ENTITY_INACTIVATION_REASON_LABEL,
  serializeEntityInactivationMetadata,
  parseEntityInactivationMetadata,
  appendEntityInactivationMetadata,
  removeEntityInactivationMetadata,
} from "./config/entity-inactivation";
export type {
  EntityInactivationReason,
  EntityInactivationMetadata,
  EntityInactivationTargetType,
} from "./config/entity-inactivation";
export {
  APP_ROLES,
  SYSTEM_ROLES,
  CLIENT_ROLES,
  CADASTRO_MANAGER_ROLES,
} from "./config/route-access";
export type { AppRole } from "./config/route-access";
export { ROLE_LABELS, getRoleLabel } from "./config/role-labels";
export { getTicketStateMatrix } from "./config/ticket-state-matrix";
export {
  TICKET_QUEUE_KEYS,
  TICKET_STATUS_GROUPS,
  OPEN_STATE_IDS,
  DEVELOPMENT_STATE_IDS,
  TESTING_STATE_IDS,
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
