import { z } from "zod";

export const ticketProviderTicketApiSchema = z.object({
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

export type TicketProviderTicketApi = z.infer<typeof ticketProviderTicketApiSchema>;

export const ticketProviderOperationalTicketSchema = z.object({
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

export type TicketProviderOperationalTicket = z.infer<typeof ticketProviderOperationalTicketSchema>;

export const ticketProviderTicketDetailsSchema = z.object({
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

export type TicketProviderTicketDetails = z.infer<typeof ticketProviderTicketDetailsSchema>;

export const ticketProviderTicketArticleSchema = z.object({
  id: z.number(),
  from: z.string().nullable().optional(),
  body: z.string(),
  created_at: z.string(),
  internal: z.boolean().nullable().optional(),
  sender: z.string().nullable().optional(),
});

export type TicketProviderTicketArticle = z.infer<typeof ticketProviderTicketArticleSchema>;

export const ticketProviderUserSearchSchema = z.object({
  organization_id: z.number().nullable().optional(),
});

export type TicketProviderUserSearch = z.infer<typeof ticketProviderUserSearchSchema>;

export const ticketProviderUserSchema = z.object({
  id: z.number(),
  firstname: z.string().nullable().optional(),
  lastname: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  active: z.boolean().nullable().optional(),
});

export type TicketProviderUser = z.infer<typeof ticketProviderUserSchema>;
