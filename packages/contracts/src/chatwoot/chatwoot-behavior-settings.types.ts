import { z } from "zod";

export const chatwootBehaviorSettingsSchema = z.object({
  autoAssignOnFirstAgentReply: z.boolean().default(true),
  reopenConversationOnCustomerReply: z.boolean().default(true),
  releaseConversationLinkOnResolved: z.boolean().default(true),
  prependAgentNameOnOutbound: z.boolean().default(true),
  systemMessagesUseBotIdentity: z.boolean().default(false),
  systemMessageApiToken: z.string().trim().max(500).default(""),
  ticketCreationAppEnabled: z.boolean().default(false),
  csatEnabled: z.boolean().default(false),
  csatReopenOnLowScore: z.boolean().default(true),
  csatLowScoreThreshold: z.coerce.number().int().min(1).max(5).default(2),
  csatPendingTimeoutHours: z.coerce.number().int().min(1).max(168).default(2),
  csatRequestMessage: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .default("Como foi seu atendimento?\n\n5 Excelente\n4 Bom\n3 Regular\n2 Ruim\n1 Pessimo"),
  csatThankYouMessage: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default("Obrigado pela sua avaliacao. Seu atendimento foi finalizado."),
});

export type ChatwootBehaviorSettingsInput = z.input<typeof chatwootBehaviorSettingsSchema>;
export type ChatwootBehaviorSettings = z.output<typeof chatwootBehaviorSettingsSchema>;

export const DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS: ChatwootBehaviorSettings = {
  autoAssignOnFirstAgentReply: true,
  reopenConversationOnCustomerReply: true,
  releaseConversationLinkOnResolved: true,
  prependAgentNameOnOutbound: true,
  systemMessagesUseBotIdentity: false,
  systemMessageApiToken: "",
  ticketCreationAppEnabled: false,
  csatEnabled: false,
  csatReopenOnLowScore: true,
  csatLowScoreThreshold: 2,
  csatPendingTimeoutHours: 2,
  csatRequestMessage: "Como foi seu atendimento?\n\n5 Excelente\n4 Bom\n3 Regular\n2 Ruim\n1 Pessimo",
  csatThankYouMessage: "Obrigado pela sua avaliacao. Seu atendimento foi finalizado.",
};

export const chatwootBehaviorSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: chatwootBehaviorSettingsSchema,
  message: z.string().optional(),
});

export type ChatwootBehaviorSettingsResponse = z.output<typeof chatwootBehaviorSettingsResponseSchema>;
