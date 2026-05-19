import { z } from "zod";

export const TASK_DELIVERY_CHANNEL_VALUES = ["CHATWOOT", "DIRECT_WHATSAPP"] as const;
export const taskDeliveryChannelSchema = z.enum(TASK_DELIVERY_CHANNEL_VALUES);

export const taskModuleSettingsSchema = z.object({
  defaultChannel: taskDeliveryChannelSchema.default("CHATWOOT"),
  fallbackToDirectWhatsapp: z.boolean().default(true),
  reuseOpenConversation: z.boolean().default(true),
  markConversationAsPending: z.boolean().default(true),
  createPrivateNoteOnDispatch: z.boolean().default(true),
  applyRoutineLabels: z.boolean().default(true),
  routineLabel: z.string().trim().min(1).max(60).default("rotina_mensal"),
  competencyLabelPrefix: z.string().trim().min(1).max(60).default("competencia"),
  autoCreateOnTicketResolved: z.boolean().default(false),
  autoTaskDueDays: z.number().int().min(1).max(90).default(3),
  autoTaskTitle: z.string().trim().min(1).max(120).default("Acompanhamento pos-atendimento — {ticket_subject}"),
  autoTaskAssignToTicketOwner: z.boolean().default(true),
});

export const DEFAULT_TASK_MODULE_SETTINGS: z.output<typeof taskModuleSettingsSchema> = {
  defaultChannel: "CHATWOOT",
  fallbackToDirectWhatsapp: true,
  reuseOpenConversation: true,
  markConversationAsPending: true,
  createPrivateNoteOnDispatch: true,
  applyRoutineLabels: true,
  routineLabel: "rotina_mensal",
  competencyLabelPrefix: "competencia",
  autoCreateOnTicketResolved: false,
  autoTaskDueDays: 3,
  autoTaskTitle: "Acompanhamento pos-atendimento — {ticket_subject}",
  autoTaskAssignToTicketOwner: true,
};

export type TaskDeliveryChannel = z.output<typeof taskDeliveryChannelSchema>;
export type TaskModuleSettingsInput = z.input<typeof taskModuleSettingsSchema>;
export type TaskModuleSettings = z.output<typeof taskModuleSettingsSchema>;
