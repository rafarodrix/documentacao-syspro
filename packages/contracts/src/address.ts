import { z } from "zod";

const emptyToUndefined = z.string().transform((val) => (val === "" ? undefined : val));

export const addressSchema = z.object({
  description: z.string().min(1, "De um nome para este endereco (ex: Sede)").default("Sede"),
  cep: z.string().min(8, "CEP incompleto").transform((val) => val.replace(/\D/g, "")),
  logradouro: z.string().min(1, "Logradouro e obrigatorio").trim(),
  numero: z.string().min(1, "Numero e obrigatorio").trim(),
  complemento: z.string().optional().or(emptyToUndefined),
  bairro: z.string().min(1, "Bairro e obrigatorio").trim(),
  cidade: z.string().min(1, "Cidade e obrigatoria").trim(),
  estado: z.string().length(2, "UF deve ter 2 letras").toUpperCase(),
  pais: z.string().default("BR"),
  codigoIbgeCidade: z.string().optional().or(emptyToUndefined).refine((val) => !val || /^\d+$/.test(val), "Codigo IBGE deve conter apenas numeros"),
  codigoIbgeEstado: z.string().optional().or(emptyToUndefined),
});

export type AddressInput = z.infer<typeof addressSchema>;