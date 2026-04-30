// Root barrel kept for compatibility and broad consumption.
// New imports should prefer context subpaths such as
// @dosc-syspro/contracts/settings or @dosc-syspro/contracts/ticket.
export * from "./settings/index";

// Keep direct exports here only for stable leaf contracts that are still
// broadly consumed or do not justify their own context package entry yet.
export { sefazRouteSchema, sefazRoutesSchema } from "./sefaz/sefaz-routes.types";
export type { SefazRouteInput, SefazRoutesInput } from "./sefaz/sefaz-routes.types";

export {
  SEFAZ_ENDPOINTS,
  SEFAZ_ROUTE_PRESETS,
  buildDefaultSefazRoutes,
  analyzeSefazResponse,
} from "./sefaz/sefaz-endpoints.types";
export type { SefazConfig, SefazRoutePreset } from "./sefaz/sefaz-endpoints.types";
export {
  SEFAZ_UFS,
  SEFAZ_OPERATIONAL_PROFILES,
  getSefazOperationalProfile,
} from "./sefaz/sefaz-topology.types";
export type {
  SefazUfCode,
  SefazOperationalProfile,
  SefazContingencyAuthorizer,
} from "./sefaz/sefaz-topology.types";

export { addressSchema } from "./shared/address.types";
export type { AddressInput } from "./shared/address.types";
export { buildPaginationMeta, paginationMetaSchema, paginationQuerySchema } from "./shared/pagination.types";
export type { PaginationMeta, PaginationQuery } from "./shared/pagination.types";

// Context exports
export * from "./company/index";
export * from "./contact/index";
export * from "./documento/index";
export * from "./user/index";
export * from "./ticket/index";
export * from "./agent/index";
export * from "./chatwoot/index";
export * from "./evolution/index";
export * from "./remote/index";
export * from "./crm/index";
export * from "./automation/index";

// Isolated shared contract kept as a direct leaf export.
export {
  platformNotificationLevelSchema,
  platformNotificationItemSchema,
  platformNotificationsResponseSchema,
} from "./shared/platform-notifications.types";
export type {
  PlatformNotificationLevel,
  PlatformNotificationItem,
  PlatformNotificationsResponse,
} from "./shared/platform-notifications.types";

export * from "./dashboard/index";
