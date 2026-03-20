import { z } from "zod";

const ufSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => /^[A-Z]{2}$/.test(value), "UF deve ter 2 letras.");

export const sefazRouteSchema = z.object({
  uf: ufSchema,
  service: z.enum(["NFE", "NFCE"]),
  url: z.string().url("URL invalida."),
  active: z.boolean().default(true),
});

export const sefazRoutesSchema = z.array(sefazRouteSchema).min(1, "Informe ao menos uma rota SEFAZ.");

export type SefazRouteInput = z.infer<typeof sefazRouteSchema>;
export type SefazRoutesInput = z.infer<typeof sefazRoutesSchema>;
