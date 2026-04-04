"use server"

import { prisma } from "@/lib/prisma"
import { getProtectedSession } from "@/lib/auth-helpers"
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api"

export type ConversationTabFilter = "ATENDENDO" | "ESPERA";

async function parseBackendResponse<T>(response: Response): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  const payload = await response.json().catch(() => ({}));
  return {
    success: Boolean(payload?.success) && response.ok,
    data: payload?.data as T | undefined,
    error: typeof payload?.error === "string" ? payload.error : "BACKEND_ERROR",
  };
}

export async function getConversations(filter: ConversationTabFilter = "ATENDENDO") {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const params = new URLSearchParams({ filter });
    const response = await fetch(`${getBackendApiBaseUrl()}/conversations?${params.toString()}`, {
      method: "GET",
      headers: withInternalApiHeaders(),
      cache: "no-store",
    });
    const result = await parseBackendResponse<any[]>(response);
    if (!result.success) return { error: result.error || "BACKEND_ERROR", data: [] };
    return { error: null, data: result.data ?? [] }
  } catch (error) {
    console.error("Erro getConversations:", error)
    return { error: "BACKEND_ERROR", data: [] }
  }
}

export async function getConversationMessages(conversationId: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/conversations/${conversationId}/messages`, {
      method: "GET",
      headers: withInternalApiHeaders(),
      cache: "no-store",
    })
    const result = await parseBackendResponse<any[]>(response);
    if (!result.success) return { error: result.error || "BACKEND_ERROR", data: [] };
    return { error: null, data: result.data ?? [] }
  } catch {
    return { error: "BACKEND_ERROR", data: [] }
  }
}

// Outbound consolidado no apps/api.
export async function sendConversationMessage(conversationId: string, text: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }

  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/conversations/send`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        conversationId,
        text,
        userId: session.userId,
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({ success: false, error: "BACKEND_ERROR" }));
    if (!response.ok || !result?.success) {
      return { error: result?.error || "DISPATCH_FAILED" };
    }

    return { error: null, success: true }
  } catch (error) {
    console.error("Send message error:", error)
    return { error: "DISPATCH_FAILED" }
  }
}

export async function resolveConversation(conversationId: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }
  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/conversations/resolve`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        conversationId,
        userId: session.userId,
      }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ success: false, error: "BACKEND_ERROR" }));
    if (!response.ok || !result?.success) return { error: result?.error || "BACKEND_ERROR" };
    return { error: null, success: true }
  } catch {
    return { error: "BACKEND_ERROR" }
  }
}

export async function linkConversationToCompany(conversationId: string, companyId: string, contactName: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }

  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/conversations/link`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        conversationId,
        companyId,
        contactName,
      }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ success: false, error: "BACKEND_ERROR" }));
    if (!response.ok || !result?.success) return { error: result?.error || "BACKEND_ERROR" };
    return { error: null, success: true, contact: result?.data ?? null }
  } catch (error) {
    console.error("Link error:", error)
    return { error: "BACKEND_ERROR" }
  }
}

export async function searchCompanies(query: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { razaoSocial: { contains: query, mode: "insensitive" } },
          { nomeFantasia: { contains: query, mode: "insensitive" } },
          { cnpj: { contains: query } }
        ]
      },
      take: 10,
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true }
    })
    return { error: null, data: companies }
  } catch {
    return { error: "DB_ERROR", data: [] }
  }
}

export async function searchSystemContacts(query: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const contacts = await prisma.companyContact.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { whatsapp: { contains: query } }
        ]
      },
      take: 20,
      include: { company: true }
    })
    return { error: null, data: contacts }
  } catch {
    return { error: "DB_ERROR", data: [] }
  }
}

export async function startOutboundConversation(contactId: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }

  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/conversations/start-outbound`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        contactId,
        userId: session.userId,
      }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ success: false, error: "BACKEND_ERROR" }));
    if (!response.ok || !result?.success) return { error: result?.error || "BACKEND_ERROR" };
    return { error: null, data: result?.data ?? null }
  } catch (e) {
    console.error("Start outbound error:", e)
    return { error: "BACKEND_ERROR" }
  }
}
