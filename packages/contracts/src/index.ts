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
  ticketApiSchema,
  operationalTicketSchema,
  ticketDetailsSchema,
  ticketArticleSchema,
  ticketUserSearchSchema,
  ticketUserSchema,
} from "./ticket-api";
export type {
  TicketApi,
  OperationalTicket,
  TicketDetails,
  TicketArticle,
  TicketUserSearch,
  TicketUser,
} from "./ticket-api";

export {
  ticketOwnerModeSchema,
  ticketArticleTypeSchema,
  ticketGlobalSettingsSchema,
  ticketCatalogGroupSchema,
  ticketCatalogStateSchema,
  ticketCatalogPrioritySchema,
  ticketCatalogOwnerSchema,
  ticketGlobalCatalogSchema,
} from "./ticket-global-settings";
export type {
  TicketOwnerMode,
  TicketArticleType,
  TicketGlobalSettings,
  TicketCatalogGroup,
  TicketCatalogState,
  TicketCatalogPriority,
  TicketCatalogOwner,
  TicketGlobalCatalog,
} from "./ticket-global-settings";


export { evolutionWebhookEnvelopeSchema, evolutionMessageEventSchema } from "./evolution-webhook";
export type { EvolutionWebhookEnvelope, EvolutionMessageEvent } from "./evolution-webhook";
export {
  EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS,
  evolutionWebhookSubscribeSchema,
  evolutionSettingsSchema,
  DEFAULT_EVOLUTION_SETTINGS,
} from "./evolution-settings";
export type {
  EvolutionSettingsInput,
  EvolutionSettings,
} from "./evolution-settings";
