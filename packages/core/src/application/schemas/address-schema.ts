import { z } from "zod";

// Helper para converter string vazia ("") em undefined para o Prisma ignorar
const emptyToUndefined = z.string().transform((val) => (val === "" ? undefined : val));

export const addressSchema = z.object({
  // Identificador do endereço (Ex: "Sede", "Filial", "Depósito")
  description: z.string()
    .min(1, "Dê um nome para este endereço (ex: Sede)")
    .default("Sede"),

  // CEP: Limpa máscara e valida tamanho
  cep: z.string()
    .min(8, "CEP incompleto")
    .transform((val) => val.replace(/\D/g, "")),

  logradouro: z.string().min(1, "Logradouro é obrigatório").trim(),

  numero: z.string().min(1, "Número é obrigatório").trim(),

  complemento: z.string().optional().or(emptyToUndefined),

  bairro: z.string().min(1, "Bairro é obrigatório").trim(),

  cidade: z.string().min(1, "Cidade é obrigatória").trim(),

  // UF: Sempre 2 letras e em maiúsculo
  estado: z.string()
    .length(2, "UF deve ter 2 letras")
    .toUpperCase(),

  pais: z.string().default("BR"),

  // Campos Fiscais (Essenciais para NF-e no seu ERP)
  codigoIbgeCidade: z.string()
    .optional()
    .or(emptyToUndefined)
    .refine((val) => !val || /^\d+$/.test(val), "Código IBGE deve conter apenas números"),

  codigoIbgeEstado: z.string()
    .optional()
    .or(emptyToUndefined),
});

// Tipo inferido para o TypeScript
export type AddressInput = z.infer<typeof addressSchema>;