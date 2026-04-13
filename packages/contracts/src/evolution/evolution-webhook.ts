import { z } from "zod";

export const evolutionWebhookEnvelopeSchema = z.object({
  event: z.string().min(1),
  data: z.unknown().optional(),
});

const evolutionMessageContentSchema = z
  .object({
    conversation: z.string().optional(),
    extendedTextMessage: z
      .object({
        text: z.string().optional(),
      })
      .passthrough()
      .optional(),
    imageMessage: z
      .object({
        caption: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const evolutionMessageInfoSchema = z
  .object({
    ID: z.string().optional(),
    Chat: z.string().optional(),
    chat: z.string().optional(),
    PushName: z.string().optional(),
    IsFromMe: z.boolean().optional(),
  })
  .passthrough();

export const evolutionMessageEventSchema = z.object({
  event: z.union([
    z.literal("MESSAGE"),
    z.literal("Message"),
    z.literal("MESSAGES_UPSERT"),
    z.literal("messages.upsert"),
  ]),
  data: z
    .object({
      Info: evolutionMessageInfoSchema.optional(),
      info: evolutionMessageInfoSchema.optional(),
      Message: evolutionMessageContentSchema.optional(),
      message: evolutionMessageContentSchema.optional(),
      remoteJid: z.string().optional(),
      fromMe: z.boolean().optional(),
      pushName: z.string().optional(),
      id: z.string().optional(),
    })
    .passthrough(),
});

export type EvolutionWebhookEnvelope = z.infer<typeof evolutionWebhookEnvelopeSchema>;
export type EvolutionMessageEvent = z.infer<typeof evolutionMessageEventSchema>;
