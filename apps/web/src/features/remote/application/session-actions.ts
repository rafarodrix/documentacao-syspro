"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://suporte.trilink.com.br";

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.message ?? "Falha ao processar sessao remota.");
  }
  return payload as T;
}

export async function requestRemoteSessionAction(input: {
  hostId: string;
  companyId: string;
  ticketId?: string | null;
  ticketNumber?: string | null;
  reason?: string | null;
}) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, error: "Nao autorizado" };
  }

  if (!(await currentUserHasPermission("tools:all"))) {
    return { success: false, error: "Apenas operadores tecnicos podem iniciar sessoes" };
  }

  try {
    const result = await postJson<{ success: true; data: { id: string } }>("/api/remote/sessions", input);

    revalidatePath("/portal/plataforma-remota/sessoes");
    revalidatePath(`/portal/plataforma-remota/hosts/${input.hostId}`);

    return {
      success: true,
      data: result.data,
      deepLink: `rustdesk://${result.data.id}`,
      appUrl: APP_URL,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao solicitar sessao" };
  }
}

export async function stopRemoteSessionAction(sessionId: string) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, error: "Nao autorizado" };
  }

  try {
    await postJson(`/api/remote/sessions/${sessionId}/stop`);
    revalidatePath("/portal/plataforma-remota/sessoes");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao encerrar sessao" };
  }
}
