import { z } from "zod";

export const chatwootBehaviorSettingsSchema = z.object({
  autoAssignOnFirstAgentReply: z.boolean().default(true),
  markConversationPendingOnAgentReply: z.boolean().default(false),
  reopenConversationOnCustomerReply: z.boolean().default(true),
  resolvedCustomerReplyAction: z.literal("new_conversation").default("new_conversation"),
  reopenSnoozedConversationOnCustomerReply: z.boolean().default(true),
  reopenPendingConversationOnCustomerReply: z.boolean().default(false),
  releaseConversationLinkOnResolved: z.boolean().default(true),
  prependAgentNameOnOutbound: z.boolean().default(true),
  systemMessagesUseBotIdentity: z.boolean().default(false),
  systemMessageApiToken: z.string().trim().max(500).default(""),
  ticketCreationAppEnabled: z.boolean().default(false),
  csatEnabled: z.boolean().default(false),
  csatTriggerStatus: z.enum(["resolved_or_archived", "resolved_only"]).default("resolved_or_archived"),
  sendCsatThankYouMessage: z.boolean().default(true),
  csatReopenOnLowScore: z.boolean().default(true),
  csatLowScoreThreshold: z.coerce.number().int().min(1).max(5).default(2),
  csatPendingTimeoutHours: z.coerce.number().int().min(1).max(168).default(2),
  csatInvalidReplyMaxAttempts: z.coerce.number().int().min(1).max(10).default(2),
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
  csatInvalidReplyRetryMessage: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default("Ainda preciso da sua nota de 1 a 5. Responda apenas com o numero."),
  csatInvalidReplyFinalMessage: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default("Nao recebi sua nota de 1 a 5. Vou encerrar esta avaliacao e sua proxima mensagem abrira um novo atendimento."),
});

export type ChatwootBehaviorSettingsInput = z.input<typeof chatwootBehaviorSettingsSchema>;
export type ChatwootBehaviorSettings = z.output<typeof chatwootBehaviorSettingsSchema>;

export const DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS: ChatwootBehaviorSettings = {
  autoAssignOnFirstAgentReply: true,
  markConversationPendingOnAgentReply: false,
  reopenConversationOnCustomerReply: true,
  resolvedCustomerReplyAction: "new_conversation",
  reopenSnoozedConversationOnCustomerReply: true,
  reopenPendingConversationOnCustomerReply: false,
  releaseConversationLinkOnResolved: true,
  prependAgentNameOnOutbound: true,
  systemMessagesUseBotIdentity: false,
  systemMessageApiToken: "",
  ticketCreationAppEnabled: false,
  csatEnabled: false,
  csatTriggerStatus: "resolved_or_archived",
  sendCsatThankYouMessage: true,
  csatReopenOnLowScore: true,
  csatLowScoreThreshold: 2,
  csatPendingTimeoutHours: 2,
  csatInvalidReplyMaxAttempts: 2,
  csatRequestMessage: "Como foi seu atendimento?\n\n5 Excelente\n4 Bom\n3 Regular\n2 Ruim\n1 Pessimo",
  csatThankYouMessage: "Obrigado pela sua avaliacao. Seu atendimento foi finalizado.",
  csatInvalidReplyRetryMessage: "Ainda preciso da sua nota de 1 a 5. Responda apenas com o numero.",
  csatInvalidReplyFinalMessage:
    "Nao recebi sua nota de 1 a 5. Vou encerrar esta avaliacao e sua proxima mensagem abrira um novo atendimento.",
};

export const chatwootBehaviorSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: chatwootBehaviorSettingsSchema,
  message: z.string().optional(),
});

export type ChatwootBehaviorSettingsResponse = z.output<typeof chatwootBehaviorSettingsResponseSchema>;
