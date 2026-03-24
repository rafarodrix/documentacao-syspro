"use server";

import { prisma } from "@/lib/prisma";
import { type DocumentoFormValues, documentoSchema } from "@dosc-syspro/contracts";
import type { DocumentosListResponse, DocumentoActionResponse } from "@/features/documentos/domain/model";
import { revalidateDocumentosViews } from "@/lib/cache-invalidation";

export async function getDocumentos(): Promise<DocumentosListResponse> {
  try {
    const docs = await prisma.documentoConfig.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return { success: true, data: docs };
  } catch (error) {
    console.error("Erro ao buscar documentos:", error);
    return { success: false, error: "Falha ao carregar dados." };
  }
}

export async function saveDocumento(data: DocumentoFormValues): Promise<DocumentoActionResponse> {
  const validation = documentoSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: "Dados invalidos." };
  }

  const {
    id,
    emitente,
    maximoItens,
    atualizaComercial,
    processamentoEtapa,
    ...payload
  } = validation.data;

  void emitente;
  void maximoItens;
  void atualizaComercial;
  void processamentoEtapa;

  try {
    if (id && id.length > 10) {
      await prisma.documentoConfig.update({
        where: { id },
        data: {
          ...payload,
          comportamentos: payload.comportamentos || [],
        },
      });
    } else {
      await prisma.documentoConfig.create({
        data: {
          ...payload,
          comportamentos: payload.comportamentos || [],
        },
      });
    }

    revalidateDocumentosViews();
    return { success: true };
  } catch (error) {
    console.error("Erro critico ao salvar no Prisma:", error);
    return { success: false, error: "Erro interno ao persistir dados." };
  }
}

export async function deleteDocumento(id: string): Promise<DocumentoActionResponse> {
  try {
    await prisma.documentoConfig.delete({ where: { id } });
    revalidateDocumentosViews();
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir:", error);
    return { success: false, error: "Erro ao excluir registro." };
  }
}
