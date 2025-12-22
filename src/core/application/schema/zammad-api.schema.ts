import { z } from "zod";

// Schema estrito para validar o que vem do Zammad
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

    // Campos opcionais/nullable garantem que a app não quebre se o Zammad mudar algo leve
    modulo: z.string().nullable().optional(),
    video_link: z.string().nullable().optional(),
    release_summary: z.string().nullable().optional(),
});

// Use este tipo nos seus Gateways ao invés de criar interfaces manuais
export type ZammadTicketAPI = z.infer<typeof zammadTicketAPISchema>;