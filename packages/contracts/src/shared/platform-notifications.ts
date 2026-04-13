import { z } from "zod";

export const platformNotificationLevelSchema = z.enum(["critical", "warning", "info"]);

export const platformNotificationItemSchema = z.object({
  id: z.string().min(1),
  level: platformNotificationLevelSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().min(1),
  createdAt: z.string().min(1),
});

export const platformNotificationsResponseSchema = z.object({
  items: z.array(platformNotificationItemSchema),
  unreadCount: z.number().int().min(0),
  generatedAt: z.string().min(1),
});

export type PlatformNotificationLevel = z.infer<typeof platformNotificationLevelSchema>;
export type PlatformNotificationItem = z.infer<typeof platformNotificationItemSchema>;
export type PlatformNotificationsResponse = z.infer<typeof platformNotificationsResponseSchema>;
