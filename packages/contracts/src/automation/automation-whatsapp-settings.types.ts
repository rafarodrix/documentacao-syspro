import { z } from "zod";

export const whatsappAutomationEventSchema = z.enum([
  "ticket_created_support",
  "ticket_created_development",
  "ticket_team_transfer_from_support",
  "ticket_team_transfer_to_support",
  "ticket_team_transfer_from_development",
  "ticket_team_transfer_to_development",
  "ticket_status_testing",
  "ticket_status_testing_failed",
  "release_published",
  "sefaz_route_down",
  "sefaz_route_recovered",
]);

export const whatsappAutomationEventFlagsSchema = z.object({
  ticketCreatedSupport: z.boolean().default(false),
  ticketCreatedDevelopment: z.boolean().default(false),
  ticketTeamTransferFromSupport: z.boolean().default(false),
  ticketTeamTransferToSupport: z.boolean().default(false),
  ticketTeamTransferFromDevelopment: z.boolean().default(false),
  ticketTeamTransferToDevelopment: z.boolean().default(false),
  ticketStatusTesting: z.boolean().default(false),
  ticketStatusTestingFailed: z.boolean().default(false),
  releasePublished: z.boolean().default(false),
  sefazRouteDown: z.boolean().default(false),
  sefazRouteRecovered: z.boolean().default(false),
});

const DEFAULT_WHATSAPP_AUTOMATION_FLAGS = {
  ticketCreatedSupport: false,
  ticketCreatedDevelopment: false,
  ticketTeamTransferFromSupport: false,
  ticketTeamTransferToSupport: false,
  ticketTeamTransferFromDevelopment: false,
  ticketTeamTransferToDevelopment: false,
  ticketStatusTesting: false,
  ticketStatusTestingFailed: false,
  releasePublished: false,
  sefazRouteDown: false,
  sefazRouteRecovered: false,
} as const;

export const whatsappAutomationBindingSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  jid: z.string().trim().min(1),
  active: z.boolean().default(true),
  automations: whatsappAutomationEventFlagsSchema.default(DEFAULT_WHATSAPP_AUTOMATION_FLAGS),
});

export const automationModuleSettingsSchema = z.object({
  autoAssignToCreator: z.boolean(),
  autoResponseEnabled: z.boolean(),
  autoResponseMessage: z.string(),
  requireTestingReturnReason: z.boolean().default(true),
  whatsapp: z.object({
    bindings: z.array(whatsappAutomationBindingSchema).default([]),
  }),
});

export const automationModuleSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: automationModuleSettingsSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type WhatsAppAutomationEvent = z.infer<typeof whatsappAutomationEventSchema>;
export type WhatsAppAutomationEventFlags = z.infer<typeof whatsappAutomationEventFlagsSchema>;
export type WhatsAppAutomationBinding = z.infer<typeof whatsappAutomationBindingSchema>;
export type AutomationModuleSettings = z.infer<typeof automationModuleSettingsSchema>;
export type AutomationModuleSettingsResponse = z.infer<typeof automationModuleSettingsResponseSchema>;

export const DEFAULT_AUTOMATION_MODULE_SETTINGS: AutomationModuleSettings = {
  autoAssignToCreator: true,
  autoResponseEnabled: false,
  autoResponseMessage: "Ola! Recebemos sua solicitacao e nossa equipe ja esta ciente. Retornaremos em breve com uma analise detalhada.",
  requireTestingReturnReason: true,
  whatsapp: {
    bindings: [],
  },
};
