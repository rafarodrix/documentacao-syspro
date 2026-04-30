import { z } from "zod";

export const chatwootIntegrationSettingsSchema = z.object({
  url: z.string().trim().max(500).default(""),
  accountId: z.string().trim().max(120).default(""),
  apiToken: z.string().trim().max(500).default(""),
  platformApiToken: z.string().trim().max(500).default(""),
  inboxId: z.string().trim().max(120).default(""),
  inboxIdentifier: z.string().trim().max(255).default(""),
  webhookSecret: z.string().trim().max(500).default(""),
  webhookMaxSkewSeconds: z.coerce.number().int().min(1).max(3600).default(300),
  incomingMediaMode: z.enum(["link", "attachment"]).default("link"),
});

export type ChatwootIntegrationSettingsInput = z.input<typeof chatwootIntegrationSettingsSchema>;
export type ChatwootIntegrationSettings = z.output<typeof chatwootIntegrationSettingsSchema>;

export const DEFAULT_CHATWOOT_INTEGRATION_SETTINGS: ChatwootIntegrationSettings = {
  url: "",
  accountId: "",
  apiToken: "",
  platformApiToken: "",
  inboxId: "",
  inboxIdentifier: "",
  webhookSecret: "",
  webhookMaxSkewSeconds: 300,
  incomingMediaMode: "link",
};

export const chatwootIntegrationSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: chatwootIntegrationSettingsSchema,
  message: z.string().optional(),
});

export type ChatwootIntegrationSettingsResponse = z.output<typeof chatwootIntegrationSettingsResponseSchema>;
