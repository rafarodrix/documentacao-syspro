import { z } from "zod";

export const EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS = [
  "ALL",
  "MESSAGE",
  "SEND_MESSAGE",
  "READ_RECEIPT",
  "PRESENCE",
  "HISTORY_SYNC",
  "CHAT_PRESENCE",
  "CALL",
  "CONNECTION",
  "LABEL",
  "CONTACT",
  "GROUP",
  "NEWSLETTER",
  "QRCODE",
] as const;

export const evolutionWebhookSubscribeSchema = z.enum(EVOLUTION_WEBHOOK_SUBSCRIBE_OPTIONS);

export const evolutionSettingsSchema = z.object({
  webhookUrl: z.string().trim().optional().default(""),
  subscribe: z.array(evolutionWebhookSubscribeSchema).min(1).default(["ALL"]),
  immediate: z.boolean().default(true),
  phone: z.string().trim().optional().default(""),
  instance: z.string().trim().optional().default(""),
  instanceId: z.string().trim().optional().default(""),
  instanceToken: z.string().trim().optional().default(""),
});

export type EvolutionSettingsInput = z.input<typeof evolutionSettingsSchema>;
export type EvolutionSettings = z.output<typeof evolutionSettingsSchema>;

export const DEFAULT_EVOLUTION_SETTINGS: EvolutionSettings = {
  webhookUrl: "",
  subscribe: ["ALL"],
  immediate: true,
  phone: "",
  instance: "",
  instanceId: "",
  instanceToken: "",
};
