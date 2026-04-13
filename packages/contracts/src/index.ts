export * from "./settings/index.js";

export { sefazRouteSchema, sefazRoutesSchema } from "./sefaz/sefaz-routes";
export type { SefazRouteInput, SefazRoutesInput } from "./sefaz/sefaz-routes";

export {
  SEFAZ_ENDPOINTS,
  SEFAZ_ROUTE_PRESETS,
  buildDefaultSefazRoutes,
  analyzeSefazResponse,
} from "./sefaz/sefaz-endpoints";
export type { SefazConfig, SefazRoutePreset } from "./sefaz/sefaz-endpoints";

export { addressSchema } from "./address";
export type { AddressInput } from "./address";

export * from "./company/index.js";
export * from "./documento/index.js";
export * from "./user/index.js";
export * from "./ticket/index.js";
export * from "./agent/index.js";
export * from "./evolution/index.js";
export * from "./remote/index.js";

export {
  platformNotificationLevelSchema,
  platformNotificationItemSchema,
  platformNotificationsResponseSchema,
} from "./platform-notifications";
export type {
  PlatformNotificationLevel,
  PlatformNotificationItem,
  PlatformNotificationsResponse,
} from "./platform-notifications";

export * from "./dashboard/index.js";
