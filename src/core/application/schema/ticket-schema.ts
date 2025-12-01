import { z } from "zod";

export const ticketSchema = z.object({
    subject: z.string()
        .min(5, 'O assunto deve ser claro e objetivo (mín. 5 caracteres).')
        .max(100, 'O assunto é muito longo. Use a descrição para detalhes.'),

    type: z.string().default('incident'),

    priority: z.string().default('2 normal'),

    description: z.string()
        .min(20, 'Por favor, forneça mais detalhes (mín. 20 caracteres).')
        .max(5000, 'Descrição muito longa.'),
});

export type TicketFormInput = z.infer<typeof ticketSchema>;