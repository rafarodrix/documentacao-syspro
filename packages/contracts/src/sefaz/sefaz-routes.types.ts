import { z } from "zod";

const autorizadorSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) => /^[A-Z]{2,6}$/.test(value),
    "UF/Autorizador deve ter entre 2 e 6 letras (ex.: MG, SP, SVRS)."
  );

export const sefazRouteSchema = z.object({
  uf: autorizadorSchema,
  service: z.enum(["NFE", "NFCE", "CTE", "MDFE"]),
  url: z.string().url("URL invalida.").refine((value) => value.startsWith("https://"), "URL deve usar HTTPS."),
  active: z.boolean().default(true),
});

export const sefazRoutesSchema = z
  .array(sefazRouteSchema)
  .min(1, "Informe ao menos uma rota SEFAZ.")
  .superRefine((routes, ctx) => {
    const seen = new Set<string>();

    routes.forEach((route, index) => {
      const key = `${route.uf}-${route.service}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "uf"],
          message: `Duplicidade detectada para ${key}.`,
        });
        return;
      }
      seen.add(key);
    });
  });

export type SefazRouteInput = z.infer<typeof sefazRouteSchema>;
export type SefazRoutesInput = z.infer<typeof sefazRoutesSchema>;