"use server";

import { type DocumentoFormValues, documentoSchema } from "@dosc-syspro/contracts/documento";
import { callWebApi } from "@/lib/web-api";
import type { DocumentosListResponse, DocumentoActionResponse } from "@/features/documentos/domain/model";
import { revalidateDocumentosViews } from "@/lib/cache-invalidation";

async function apiRequest(path: string, init?: RequestInit) {
  return callWebApi(`/api${path}`, init);
}

export async function getDocumentos(): Promise<DocumentosListResponse> {
  try {
    const response = await apiRequest("/documentos");
    const payload = (await response.json().catch(() => null)) as DocumentosListResponse | null;
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

    const payload = (await response.json().catch(() => null)) as DocumentoActionResponse | null;
    if (!response.ok || !payload?.success) {
      return { success: false, error: payload?.success === false ? payload.error : "Erro interno ao persistir dados." };
    }

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

    const payload = (await response.json().catch(() => null)) as DocumentoActionResponse | null;
    if (!response.ok || !payload?.success) {
      return { success: false, error: payload?.success === false ? payload.error : "Erro ao excluir registro." };
    }

    revalidateDocumentosViews();
    return payload;
  } catch (error) {
    console.error("Erro ao excluir:", error);
    return { success: false, error: "Erro ao excluir registro." };
  }
}
