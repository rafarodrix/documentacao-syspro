import { z } from "zod";

export const documentoSchema = z.object({
  id: z.string().optional(),
  empresa: z.string().optional().default(""),
  emitente: z.string().optional().default("PROPRIO"),
  descricao: z.string().min(3, "Descricao e obrigatoria"),
  modelo: z.string().min(1, "Modelo obrigatorio").default("55"),
  serie: z.string().min(1, "Serie obrigatoria").default("1"),
  maximoItens: z.coerce.number().min(1).default(999),
  grupoDocumento: z.string().min(1, "Grupo e obrigatorio"),
  movimentaEstoque: z.enum(["SAIDA", "ENTRADA", "NAO"]).default("SAIDA"),
  atualizaComercial: z.boolean().default(true),
  processamentoEtapa: z.boolean().default(false),
  finalidadeNFe: z.string().default("1"),
  comportamentos: z.array(z.string()).optional().default([]),
  tpNFCredito: z.string().optional().default(""),
  tpNFDebito: z.string().optional().default(""),
  cfopEstadual: z.string().optional().default(""),
  cfopInterestadual: z.string().optional().default(""),
  cfopEstadualST: z.string().optional().default(""),
  cfopInterestadualST: z.string().optional().default(""),
  cfopEstadualConsumidor: z.string().optional().default(""),
  cfopInterestadualConsumidor: z.string().optional().default(""),
  cfopInternacional: z.string().optional().default(""),
});

export type DocumentoFormValues = z.infer<typeof documentoSchema>;