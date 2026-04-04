import { z } from "zod";

export const evolutionMessageUpsertPayloadSchema = z.object({
  event: z.literal("messages.upsert"),
  data: z.object({
    key: z.object({
      id: z.string().min(1),
      remoteJid: z.string().min(1),
      fromMe: z.boolean(),
    }),
    pushName: z.string().optional(),
    message: z.record(z.unknown()),
  }),
});

export type EvolutionMessageUpsertPayload = z.infer<typeof evolutionMessageUpsertPayloadSchema>;
