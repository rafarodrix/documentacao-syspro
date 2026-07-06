"use server";

import { type DocumentoFormValues, documentoSchema } from "@dosc-syspro/contracts/documento";
import {
  createWebApiRequest,
  parseActionResponse,
  readJsonResponse,
} from "@/lib/server-action-api";
import type { DocumentosListResponse, DocumentoActionResponse } from "@/features/documentos/domain/documento.types";
import { revalidateDocumentosViews } from "@/lib/cache-invalidation";

const apiRequest = createWebApiRequest("/api");

export async function getDocumentos(): Promise<DocumentosListResponse> {
  try {
    const response = await apiRequest("/documentos");
    const payload = await readJsonResponse<DocumentosListResponse>(response);
    if (!response.ok || !payload?.success) {
      return { success: false, error: payload?.success === false ? payload.error : "Falha ao carregar dados." };
    }

    return payload;
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

  try {
    const response = await apiRequest("/documentos", {
      method: "POST",
      body: JSON.stringify(validation.data),
    });

    const payload = await parseActionResponse<DocumentoActionResponse>(response, "Erro interno ao persistir dados.");
    if (!payload.success) return payload;
    revalidateDocumentosViews();
    return payload;
  } catch (error) {
    console.error("Erro ao salvar documento:", error);
    return { success: false, error: "Erro interno ao persistir dados." };
  }
}

export async function deleteDocumento(id: string): Promise<DocumentoActionResponse> {
  try {
    const response = await apiRequest(`/documentos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const payload = await parseActionResponse<DocumentoActionResponse>(response, "Erro ao excluir registro.");
    if (!payload.success) return payload;
    revalidateDocumentosViews();
    return payload;
  } catch (error) {
    console.error("Erro ao excluir:", error);
    return { success: false, error: "Erro ao excluir registro." };
  }
}
