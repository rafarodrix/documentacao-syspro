'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentoSchema, type DocumentoFormInput, type DocumentoFormValues } from "@dosc-syspro/contracts/documento";

export function useDocumentoForm(initialValues?: Partial<DocumentoFormValues> | null) {
  // 1. Sanitização manual: garante que null vire valor válido
  // Isso é crítico para o React Hook Form controlar os inputs corretamente
  const defaultValues: DocumentoFormValues = {
    id: initialValues?.id,
    empresa: initialValues?.empresa ?? "",
    descricao: initialValues?.descricao ?? "",
    grupoDocumento: initialValues?.grupoDocumento ?? "",
    modelo: initialValues?.modelo || "55",
    serie: initialValues?.serie || "1",
    emitente: initialValues?.emitente || "PROPRIO",
    maximoItens: Number(initialValues?.maximoItens ?? 999),
    atualizaComercial: initialValues?.atualizaComercial ?? true,
    processamentoEtapa: initialValues?.processamentoEtapa ?? false,
    movimentaEstoque: (["SAIDA", "ENTRADA", "NAO"].includes(initialValues?.movimentaEstoque as string)
      ? initialValues?.movimentaEstoque
      : "SAIDA") as "SAIDA" | "ENTRADA" | "NAO",
    finalidadeNFe: initialValues?.finalidadeNFe || "1",
    tpNFCredito: initialValues?.tpNFCredito ?? "",
    tpNFDebito: initialValues?.tpNFDebito ?? "",
    cfopEstadual: initialValues?.cfopEstadual ?? "",
    cfopInterestadual: initialValues?.cfopInterestadual ?? "",
    cfopEstadualST: initialValues?.cfopEstadualST ?? "",
    cfopInterestadualST: initialValues?.cfopInterestadualST ?? "",
    cfopEstadualConsumidor: initialValues?.cfopEstadualConsumidor ?? "",
    cfopInterestadualConsumidor: initialValues?.cfopInterestadualConsumidor ?? "",
    cfopInternacional: initialValues?.cfopInternacional ?? "",
    comportamentos: initialValues?.comportamentos ?? [],
  };

  return useForm<DocumentoFormInput, undefined, DocumentoFormValues>({
    resolver: zodResolver(documentoSchema),
    defaultValues,
    mode: "onChange"
  });
}
