import { z } from "zod";

export const ticketFormSchema = z.object({
  subject: z.string()
    .min(5, "O assunto deve ser claro e objetivo (min. 5 caracteres).")
    .max(100, "O assunto e muito longo. Use a descricao para detalhes."),
  type: z.string().default("incident"),
  priority: z.string().default("2 normal"),
  description: z.string()
    .min(20, "Por favor, forneca mais detalhes (min. 20 caracteres).")
    .max(5000, "Descricao muito longa."),
});

export type TicketFormInput = z.input<typeof ticketFormSchema>;
export type TicketFormOutput = z.output<typeof ticketFormSchema>;