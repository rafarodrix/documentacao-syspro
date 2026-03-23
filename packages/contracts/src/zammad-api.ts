import { z } from "zod";

export const zammadTicketAPISchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string(),
  type: z.string().optional(),
  updated_at: z.string(),
  close_at: z.string().nullable(),
  state_id: z.number(),
  priority_id: z.number(),
  group_id: z.number().optional(),
  modulo: z.string().nullable().optional(),
  video_link: z.string().nullable().optional(),
  release_summary: z.string().nullable().optional(),
});

export type ZammadTicketAPI = z.infer<typeof zammadTicketAPISchema>;

export const zammadOperationalTicketSchema = z.object({
  id: z.number(),
  number: z.union([z.string(), z.number()]).transform((v) => String(v)),
  title: z.string(),
  group: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  state_id: z.number().nullable().optional(),
  priority_id: z.number().nullable().optional(),
  owner_id: z.number().nullable().optional(),
  customer: z.union([z.string(), z.number()]).nullable().optional(),
  first_response_at: z.string().nullable().optional(),
  close_at: z.string().nullable().optional(),
  escalation_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ZammadOperationalTicket = z.infer<typeof zammadOperationalTicketSchema>;

export const zammadTicketDetailsSchema = z.object({
  id: z.number(),
  number: z.union([z.string(), z.number()]).transform((v) => String(v)),
  title: z.string(),
  state: z.string().nullable().optional(),
  state_id: z.number().nullable().optional(),
  priority_id: z.number().nullable().optional(),
  owner_id: z.number().nullable().optional(),
  customer: z.union([z.string(), z.number()]).nullable().optional(),
  first_response_at: z.string().nullable().optional(),
  close_at: z.string().nullable().optional(),
  escalation_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export type ZammadTicketDetails = z.infer<typeof zammadTicketDetailsSchema>;

export const zammadTicketArticleSchema = z.object({
  id: z.number(),
  from: z.string().nullable().optional(),
  body: z.string(),
  created_at: z.string(),
  internal: z.boolean().nullable().optional(),
  sender: z.string().nullable().optional(),
});

export type ZammadTicketArticle = z.infer<typeof zammadTicketArticleSchema>;

export const zammadUserSearchSchema = z.object({
  organization_id: z.number().nullable().optional(),
});

export type ZammadUserSearch = z.infer<typeof zammadUserSearchSchema>;