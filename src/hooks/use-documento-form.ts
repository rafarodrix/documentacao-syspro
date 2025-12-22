'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentoSchema, DocumentoFormValues } from "@/core/application/schema/documento-schema";

export function useDocumentoForm(initialValues?: Partial<DocumentoFormValues> | null) {

    // 1. Sanitização Manual: Garante que null vire valor válido
    // Isso evita o erro de "uncontrolled component" no React
    const defaultValues: DocumentoFormValues = {
        id: initialValues?.id, // undefined é ok para ID
        empresa: initialValues?.empresa ?? "",
        emitente: initialValues?.emitente || "PROPRIO",
        descricao: initialValues?.descricao ?? "",
        modelo: initialValues?.modelo || "55",
        serie: initialValues?.serie || "1",

        // Garante numérico
        maximoItens: Number(initialValues?.maximoItens ?? 999),

        grupoDocumento: initialValues?.grupoDocumento ?? "",

        // Garante que o Enum seja válido (fallback para SAIDA)
        movimentaEstoque: (["SAIDA", "ENTRADA", "NAO"].includes(initialValues?.movimentaEstoque as string)
            ? initialValues?.movimentaEstoque
            : "SAIDA") as "SAIDA" | "ENTRADA" | "NAO",

        atualizaComercial: initialValues?.atualizaComercial ?? true,
        processamentoEtapa: initialValues?.processamentoEtapa ?? false,

        finalidadeNFe: initialValues?.finalidadeNFe || "1",
        tpNFCredito: initialValues?.tpNFCredito ?? "",
        tpNFDebito: initialValues?.tpNFDebito ?? "",

        cfopEstadual: initialValues?.cfopEstadual ?? "",
        cfopInterestadual: initialValues?.cfopInterestadual ?? "",
        cfopInternacional: initialValues?.cfopInternacional ?? "",
    };

    return useForm({
        resolver: zodResolver(documentoSchema),
        defaultValues: defaultValues as any,
        mode: "onChange"
    });
}