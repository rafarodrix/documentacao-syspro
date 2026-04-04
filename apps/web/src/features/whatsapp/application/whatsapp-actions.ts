"use server"

import { getProtectedSession } from "@/lib/auth-helpers";
import { hasEvolutionApiCredentials, readEvolutionConfig } from "@dosc-syspro/api/services/evolution-config";

const evolutionConfig = readEvolutionConfig(process.env);
const evolutionUrl = evolutionConfig.apiUrl;
const evolutionKey = evolutionConfig.apiKey;
const evolutionInstance = evolutionConfig.instance;

function getHeaders() {
  return {
    "apikey": evolutionKey,
    "Content-Type": "application/json",
  };
}

export async function getEvolutionConnectionState() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { error: "UNAUTHORIZED", state: "unknown" };
  }

  if (!hasEvolutionApiCredentials({ apiUrl: evolutionUrl, apiKey: evolutionKey })) {
    return { error: "NOT_CONFIGURED", state: "unknown" };
  }

  try {
    const url = `${evolutionUrl}/instance/status`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) {
        return { error: "INSTANCE_NOT_FOUND", state: "unknown" };
      }
      return { error: "API_ERROR", state: "unknown" };
    }
    const data = await res.json();
    const state = (
      data?.state ??
      data?.status ??
      data?.instance?.state ??
      data?.instance?.status ??
      data?.data?.state ??
      data?.data?.status ??
      "unknown"
    ) as string;
    return { error: null, state, data };
  } catch (error) {
    console.error("Evolution getConnectionState error:", error);
    return { error: "FETCH_ERROR", state: "unknown" };
  }
}

export async function getEvolutionQrCode() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { error: "UNAUTHORIZED", base64: null };
  }

  try {
    const connectUrl = `${evolutionUrl}/instance/connect`;
    await fetch(connectUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name: evolutionInstance }),
    }).catch(() => undefined);

    const url = `${evolutionUrl}/instance/qr`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) {
      if(res.status === 404) {
         // Instância precisa ser criada
         return { error: "INSTANCE_NOT_FOUND", base64: null };
      }
      return { error: "API_ERROR", base64: null };
    }
    const data = await res.json();
    const qrCode =
      data?.data?.Qrcode ||
      data?.data?.qrcode ||
      data?.qrCode ||
      data?.base64 ||
      null;
    return { error: null, base64: qrCode };
  } catch (error) {
    console.error("Evolution getQrCode error:", error);
    return { error: "FETCH_ERROR", base64: null };
  }
}

export async function createEvolutionInstance() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { error: "UNAUTHORIZED" };
  }

  try {
    const url = `${evolutionUrl}/instance/create`;
    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: evolutionInstance,
        token: evolutionKey || undefined,
      })
    });
    if (!res.ok && res.status !== 409) return { error: "CREATE_FAILED" };
    return { error: null, success: true };
  } catch (error) {
    console.error("Evolution create instance error:", error);
    return { error: "FETCH_ERROR" };
  }
}
