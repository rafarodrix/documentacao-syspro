import { z } from "zod";

export const ZammadTicketAPISchema = z.object({
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

export type ZammadTicketAPI = z.infer<typeof ZammadTicketAPISchema>;
