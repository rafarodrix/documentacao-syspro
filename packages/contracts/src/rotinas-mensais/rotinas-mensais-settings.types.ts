import { z } from "zod";

export const MONTHLY_ROUTINE_DELIVERY_CHANNEL_VALUES = ["CHATWOOT", "DIRECT_WHATSAPP"] as const;

export const monthlyRoutineDeliveryChannelSchema = z.enum(MONTHLY_ROUTINE_DELIVERY_CHANNEL_VALUES);

export const monthlyRoutineModuleSettingsSchema = z.object({
  defaultChannel: monthlyRoutineDeliveryChannelSchema.default("CHATWOOT"),
  fallbackToDirectWhatsapp: z.boolean().default(true),
  reuseOpenConversation: z.boolean().default(true),
  markConversationAsPending: z.boolean().default(true),
  createPrivateNoteOnDispatch: z.boolean().default(true),
  applyRoutineLabels: z.boolean().default(true),
  routineLabel: z.string().trim().min(1).max(60).default("rotina_mensal"),
  competencyLabelPrefix: z.string().trim().min(1).max(60).default("competencia"),
});

export const DEFAULT_MONTHLY_ROUTINE_MODULE_SETTINGS: z.output<typeof monthlyRoutineModuleSettingsSchema> = {
  defaultChannel: "CHATWOOT",
  fallbackToDirectWhatsapp: true,
  reuseOpenConversation: true,
  markConversationAsPending: true,
  createPrivateNoteOnDispatch: true,
  applyRoutineLabels: true,
  routineLabel: "rotina_mensal",
  competencyLabelPrefix: "competencia",
};

export type MonthlyRoutineDeliveryChannel = z.output<typeof monthlyRoutineDeliveryChannelSchema>;
export type MonthlyRoutineModuleSettingsInput = z.input<typeof monthlyRoutineModuleSettingsSchema>;
export type MonthlyRoutineModuleSettings = z.output<typeof monthlyRoutineModuleSettingsSchema>;
