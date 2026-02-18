import { z } from "zod";

export const documentoSchema = z.object({
    id: z.string().optional(),

    // Strings opcionais: Deixe o Zod aceitar e lidar com vazios
    empresa: z.string().optional().default(""),
    emitente: z.string().optional().default("PROPRIO"),
    descricao: z.string().min(3, "Descrição é obrigatória"),

    // Como são inputs de texto, trate como string no schema
    modelo: z.string().min(1, "Modelo obrigatório").default("55"),
    serie: z.string().min(1, "Série obrigatória").default("1"),

    // O COERCE é vital aqui: Transforma a string do input em number
    maximoItens: z.coerce.number().min(1).default(999),

    grupoDocumento: z.string().min(1, "Grupo é obrigatório"),

    // Enum estrito
    movimentaEstoque: z.enum(["SAIDA", "ENTRADA", "NAO"]).default("SAIDA"),

    atualizaComercial: z.boolean().default(true),
    processamentoEtapa: z.boolean().default(false),

    // Reforma Tributária
    finalidadeNFe: z.string().default("1"),
    comportamentos: z.array(z.string()).optional().default([]),
    tpNFCredito: z.string().optional().default(""),
    tpNFDebito: z.string().optional().default(""),

    // Fiscais
    cfopEstadual: z.string().optional().default(""),
    cfopInterestadual: z.string().optional().default(""),

    cfopEstadualST: z.string().optional().default(""),
    cfopInterestadualST: z.string().optional().default(""),

    cfopEstadualConsumidor: z.string().optional().default(""),
    cfopInterestadualConsumidor: z.string().optional().default(""),

    cfopInternacional: z.string().optional().default(""),
});

export type DocumentoFormValues = z.infer<typeof documentoSchema>;