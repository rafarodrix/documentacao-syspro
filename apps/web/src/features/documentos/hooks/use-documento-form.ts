'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentoSchema, DocumentoFormValues } from "@dosc-syspro/contracts";

export function useDocumentoForm(initialValues?: Partial<DocumentoFormValues> | null) {

    // 1. SanitizaÃ§Ã£o Manual: Garante que null vire valor vÃ¡lido
    // Isso Ã© CRÃTICO para o React Hook Form controlar os inputs corretamente
    const defaultValues: DocumentoFormValues = {
        id: initialValues?.id,

        // Dados Gerais
        empresa: initialValues?.empresa ?? "",
        descricao: initialValues?.descricao ?? "",
        grupoDocumento: initialValues?.grupoDocumento ?? "",
        modelo: initialValues?.modelo || "55",
        serie: initialValues?.serie || "1",

        // Campos que nÃ£o estÃ£o na tela mas o banco/zod espera (Defaults seguros)
        emitente: initialValues?.emitente || "PROPRIO",
        maximoItens: Number(initialValues?.maximoItens ?? 999),
        atualizaComercial: initialValues?.atualizaComercial ?? true,
        processamentoEtapa: initialValues?.processamentoEtapa ?? false,

        // Garante que o Enum seja vÃ¡lido (fallback para SAIDA)
        movimentaEstoque: (["SAIDA", "ENTRADA", "NAO"].includes(initialValues?.movimentaEstoque as string)
            ? initialValues?.movimentaEstoque
            : "SAIDA") as "SAIDA" | "ENTRADA" | "NAO",

        // Fiscal e Finalidade
        finalidadeNFe: initialValues?.finalidadeNFe || "1",
        tpNFCredito: initialValues?.tpNFCredito ?? "",
        tpNFDebito: initialValues?.tpNFDebito ?? "",

        // === MATRIZ DE CFOPs (Atualizado) ===
        // 1. PadrÃ£o (Tributado)
        cfopEstadual: initialValues?.cfopEstadual ?? "",
        cfopInterestadual: initialValues?.cfopInterestadual ?? "",

        // 2. ST (SubstituiÃ§Ã£o TributÃ¡ria)
        cfopEstadualST: initialValues?.cfopEstadualST ?? "",
        cfopInterestadualST: initialValues?.cfopInterestadualST ?? "",

        // 3. Consumidor Final
        cfopEstadualConsumidor: initialValues?.cfopEstadualConsumidor ?? "",
        cfopInterestadualConsumidor: initialValues?.cfopInterestadualConsumidor ?? "",

        // 4. Exterior
        cfopInternacional: initialValues?.cfopInternacional ?? "",

        // Regras e Comportamentos (Array)
        comportamentos: initialValues?.comportamentos ?? [],
    };

    // 2. InicializaÃ§Ã£o do Form
    return useForm({
        resolver: zodResolver(documentoSchema),
        defaultValues: defaultValues as any,
        mode: "onChange"
    });
}