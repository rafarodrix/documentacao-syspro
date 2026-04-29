"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://suporte.trilink.com.br";

type RemoteActionErrorPayload = {
  message?: string;
  error?: string;
  code?: string;
  data?: unknown;
  httpStatus?: number;
};

class RemoteSessionActionError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly data?: unknown,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as RemoteActionErrorPayload | null;
  if (!response.ok) {
    throw new RemoteSessionActionError(
      payload?.error ?? payload?.message ?? "Falha ao processar sessao remota.",
      payload?.code,
      payload?.data,
      payload?.httpStatus ?? response.status,
    );
  }
  return payload as T;
}

type RemoteSessionRecord = {
  id: string;
  status?: string | null;
};

function readSessionRecord(value: unknown): RemoteSessionRecord | null {
  if (!value || typeof value !== "object") return null;
  const id = "id" in value ? String((value as { id?: unknown }).id ?? "").trim() : "";
  if (!id) return null;
  const status =
    "status" in value && typeof (value as { status?: unknown }).status === "string"
      ? String((value as { status?: string }).status)
      : null;
  return { id, status };
}

async function ensureStartedSession(sessionId: string) {
  const result = await postJson<{ success: true; data: RemoteSessionRecord }>(`/api/remote/sessions/${sessionId}/start`);
  return result.data;
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
    const created = await postJson<{ success: true; data: RemoteSessionRecord }>("/api/remote/sessions", input);
    const started = await ensureStartedSession(created.data.id);

    revalidatePath("/portal/infraestrutura?tab=sessoes");
    revalidatePath(`/portal/infraestrutura/hosts/${input.hostId}`);

    return {
      success: true,
      data: started,
      deepLink: `rustdesk://${started.id}`,
      appUrl: APP_URL,
    };
  } catch (error) {
    if (error instanceof RemoteSessionActionError && error.code === "SESSION_DUPLICATE_OPEN") {
      const existingSession = readSessionRecord(error.data);
      if (existingSession) {
        try {
          const activeSession =
            existingSession.status === "REQUESTED"
              ? await ensureStartedSession(existingSession.id)
              : existingSession;

          revalidatePath("/portal/infraestrutura?tab=sessoes");
          revalidatePath(`/portal/infraestrutura/hosts/${input.hostId}`);

          return {
            success: true,
            data: activeSession,
            deepLink: `rustdesk://${activeSession.id}`,
            appUrl: APP_URL,
            reused: true,
          };
        } catch (startError) {
          return {
            success: false,
            error: startError instanceof Error ? startError.message : "Falha ao reutilizar sessao aberta.",
          };
        }
      }
    }

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
    revalidatePath("/portal/infraestrutura?tab=sessoes");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao encerrar sessao" };
  }
}
