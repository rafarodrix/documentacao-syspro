'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentoSchema, DocumentoFormValues } from "@/core/application/schema/documento-schema";

export function useDocumentoForm(initialValues?: Partial<DocumentoFormValues> | null) {

    // 1. Sanitização Manual: Garante que null vire valor válido
    // Isso é CRÍTICO para o React Hook Form controlar os inputs corretamente
    const defaultValues: DocumentoFormValues = {
        id: initialValues?.id,

        // Dados Gerais
        empresa: initialValues?.empresa ?? "",
        descricao: initialValues?.descricao ?? "",
        grupoDocumento: initialValues?.grupoDocumento ?? "",
        modelo: initialValues?.modelo || "55",
        serie: initialValues?.serie || "1",

        // Campos que não estão na tela mas o banco/zod espera (Defaults seguros)
        emitente: initialValues?.emitente || "PROPRIO",
        maximoItens: Number(initialValues?.maximoItens ?? 999),
        atualizaComercial: initialValues?.atualizaComercial ?? true,
        processamentoEtapa: initialValues?.processamentoEtapa ?? false,

        // Garante que o Enum seja válido (fallback para SAIDA)
        movimentaEstoque: (["SAIDA", "ENTRADA", "NAO"].includes(initialValues?.movimentaEstoque as string)
            ? initialValues?.movimentaEstoque
            : "SAIDA") as "SAIDA" | "ENTRADA" | "NAO",

        // Fiscal e Finalidade
        finalidadeNFe: initialValues?.finalidadeNFe || "1",
        tpNFCredito: initialValues?.tpNFCredito ?? "",
        tpNFDebito: initialValues?.tpNFDebito ?? "",

        // === MATRIZ DE CFOPs (Atualizado) ===
        // 1. Padrão (Tributado)
        cfopEstadual: initialValues?.cfopEstadual ?? "",
        cfopInterestadual: initialValues?.cfopInterestadual ?? "",

        // 2. ST (Substituição Tributária)
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

    // 2. Inicialização do Form
    return useForm({
        resolver: zodResolver(documentoSchema),
        defaultValues: defaultValues as any,
        mode: "onChange"
    });
}