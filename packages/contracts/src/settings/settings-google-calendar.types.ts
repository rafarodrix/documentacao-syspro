import { z } from "zod";

export const googleCalendarSettingsSchema = z.object({
  provider: z.literal("google_calendar").default("google_calendar"),
  enabled: z.boolean().default(false),
  calendarId: z.string().trim().default(""),
  timeZone: z.string().trim().default("America/Sao_Paulo"),
  clientId: z.string().trim().default(""),
  clientSecret: z.string().trim().default(""),
  refreshToken: z.string().trim().default(""),
  defaultEventDurationMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  syncManualTasks: z.boolean().default(true),
  syncTicketFollowUpTasks: z.boolean().default(true),
  eventTitlePrefix: z.string().trim().max(80).default(""),
});

export const DEFAULT_GOOGLE_CALENDAR_SETTINGS: z.output<typeof googleCalendarSettingsSchema> = {
  provider: "google_calendar",
  enabled: false,
  calendarId: "",
  timeZone: "America/Sao_Paulo",
  clientId: "",
  clientSecret: "",
  refreshToken: "",
  defaultEventDurationMinutes: 30,
  syncManualTasks: true,
  syncTicketFollowUpTasks: true,
  eventTitlePrefix: "",
};

export type GoogleCalendarSettingsInput = z.input<typeof googleCalendarSettingsSchema>;
export type GoogleCalendarSettings = z.output<typeof googleCalendarSettingsSchema>;
