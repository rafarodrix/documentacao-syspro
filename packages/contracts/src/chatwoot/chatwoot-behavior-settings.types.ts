import { z } from "zod";

export const chatwootBehaviorSettingsSchema = z.object({
  autoAssignOnFirstAgentReply: z.boolean().default(false),
  reopenConversationOnCustomerReply: z.boolean().default(true),
  releaseConversationLinkOnResolved: z.boolean().default(true),
  ticketCreationAppEnabled: z.boolean().default(false),
});

export type ChatwootBehaviorSettingsInput = z.input<typeof chatwootBehaviorSettingsSchema>;
export type ChatwootBehaviorSettings = z.output<typeof chatwootBehaviorSettingsSchema>;

export const DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS: ChatwootBehaviorSettings = {
  autoAssignOnFirstAgentReply: false,
  reopenConversationOnCustomerReply: true,
  releaseConversationLinkOnResolved: true,
  ticketCreationAppEnabled: false,
};

export const chatwootBehaviorSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: chatwootBehaviorSettingsSchema,
  message: z.string().optional(),
});

export type ChatwootBehaviorSettingsResponse = z.output<typeof chatwootBehaviorSettingsResponseSchema>;
