export { settingsSchema, SETTING_KEYS } from "./settings";
export type { SettingsInput, SettingsOutput } from "./settings";

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
export type { TicketFormInput, TicketFormOutput } from "./ticket-form";
export { addressSchema } from "./address";
export type { AddressInput } from "./address";

export {
  createCompanySchema,
  COMPANY_REMOTE_CONNECTION_TYPE_VALUES,
  COMPANY_SERVER_PROTOCOL_VALUES,
  COMPANY_SERVER_TYPE_VALUES,
  DEFAULT_COMPANY_INSTALLATION_DIRECTORY,
  DEFAULT_COMPANY_SERVER_HOST,
  DEFAULT_COMPANY_SERVER_PORT,
  DEFAULT_COMPANY_SERVER_PROTOCOL,
  DEFAULT_COMPANY_SERVER_TYPE,
} from "./company";
export type { CreateCompanyInput, CreateCompanyOutput } from "./company";

export { documentoSchema } from "./documento";
export type { DocumentoFormInput, DocumentoFormValues } from "./documento";

export {
  FIELD_METADATA,
  GRUPOS_DOCUMENTO,
  COMPORTAMENTOS_DOCUMENTO,
  TIPOS_NOTA_DEBITO,
  TIPOS_NOTA_CREDITO,
} from "./documento-config";
export type { FieldMetadata } from "./documento-config";

export { USER_ROLE_VALUES, createUserSchema, linkUserToCompanySchema } from "./user";
export type { CreateUserInput, CreateUserOutput, LinkUserToCompanyInput } from "./user";

export {
  zammadTicketAPISchema,
  zammadOperationalTicketSchema,
  zammadTicketDetailsSchema,
  zammadTicketArticleSchema,
  zammadUserSearchSchema,
  zammadUserSchema,
} from "./zammad-api";
export type {
  ZammadTicketAPI,
  ZammadOperationalTicket,
  ZammadTicketDetails,
  ZammadTicketArticle,
  ZammadUserSearch,
  ZammadUser,
} from "./zammad-api";


export {
  zammadOwnerModeSchema,
  zammadArticleTypeSchema,
  zammadGlobalSettingsSchema,
  zammadCatalogGroupSchema,
  zammadCatalogStateSchema,
  zammadCatalogPrioritySchema,
  zammadCatalogOwnerSchema,
  zammadGlobalCatalogSchema,
} from "./zammad-global-settings";
export type {
  ZammadOwnerMode,
  ZammadArticleType,
  ZammadGlobalSettings,
  ZammadCatalogGroup,
  ZammadCatalogState,
  ZammadCatalogPriority,
  ZammadCatalogOwner,
  ZammadGlobalCatalog,
} from "./zammad-global-settings";

export { evolutionWebhookEnvelopeSchema, evolutionMessageEventSchema } from "./whatsapp-evolution";
export type { EvolutionWebhookEnvelope, EvolutionMessageEvent } from "./whatsapp-evolution";
