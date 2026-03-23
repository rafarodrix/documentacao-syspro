export { settingsSchema, SETTING_KEYS } from "./settings";
export type { SettingsInput } from "./settings";

export { sefazRouteSchema, sefazRoutesSchema } from "./sefaz-routes";
export type { SefazRouteInput, SefazRoutesInput } from "./sefaz-routes";

export {
  SEFAZ_ENDPOINTS,
  SEFAZ_ROUTE_PRESETS,
  buildDefaultSefazRoutes,
  analyzeSefazResponse,
} from "./sefaz-endpoints";
export type { SefazConfig, SefazRoutePreset } from "./sefaz-endpoints";

export { ticketFormSchema } from "./ticket-form";
export type { TicketFormInput } from "./ticket-form";

export { documentoSchema } from "./documento";
export type { DocumentoFormValues } from "./documento";

export {
  FIELD_METADATA,
  GRUPOS_DOCUMENTO,
  COMPORTAMENTOS_DOCUMENTO,
  TIPOS_NOTA_DEBITO,
  TIPOS_NOTA_CREDITO,
} from "./documento-config";
export type { FieldMetadata } from "./documento-config";

export { USER_ROLE_VALUES, createUserSchema } from "./user";
export type { CreateUserInput, CreateUserOutput } from "./user";

export {
  zammadTicketAPISchema,
  zammadOperationalTicketSchema,
  zammadTicketDetailsSchema,
  zammadTicketArticleSchema,
  zammadUserSearchSchema,
} from "./zammad-api";
export type {
  ZammadTicketAPI,
  ZammadOperationalTicket,
  ZammadTicketDetails,
  ZammadTicketArticle,
  ZammadUserSearch,
} from "./zammad-api";