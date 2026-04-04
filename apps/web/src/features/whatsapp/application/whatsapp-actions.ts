"use server"

import { getProtectedSession } from "@/lib/auth-helpers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export async function getEvolutionConnectionState() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { error: "UNAUTHORIZED", state: "unknown" };
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/whatsapp/connection-state`, {
      method: "GET",
      headers: withInternalApiHeaders(),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { error: data?.error || "BACKEND_ERROR", state: data?.state || "unknown" };
    }

    return { error: null, state: data?.state || "unknown", data: data?.data };
  } catch (error) {
    console.error("Evolution getConnectionState error:", error);
    return { error: "BACKEND_ERROR", state: "unknown" };
  }
}

export async function getEvolutionQrCode() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { error: "UNAUTHORIZED", base64: null };
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/whatsapp/qr-code`, {
      method: "GET",
      headers: withInternalApiHeaders(),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { error: data?.error || "BACKEND_ERROR", base64: null };
    }

    return { error: null, base64: data?.base64 ?? null };
  } catch (error) {
    console.error("Evolution getQrCode error:", error);
    return { error: "BACKEND_ERROR", base64: null };
  }
}

export async function createEvolutionInstance() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { error: "UNAUTHORIZED" };
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/whatsapp/instance/create`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      body: "{}",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { error: data?.error || "CREATE_FAILED" };
    }

    return { error: null, success: true };
  } catch (error) {
    console.error("Evolution create instance error:", error);
    return { error: "BACKEND_ERROR" };
  }
}
