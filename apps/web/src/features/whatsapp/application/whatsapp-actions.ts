"use server"

import { getProtectedSession } from "@/lib/auth-helpers";
import { z } from "zod";

const evolutionUrl = process.env.EVOLUTION_URL || "";
const evolutionKey = process.env.EVOLUTION_API_KEY || "";
const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME || "Syspro";

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

  if (!evolutionUrl || !evolutionKey) {
    return { error: "NOT_CONFIGURED", state: "unknown" };
  }

  try {
    const url = `${evolutionUrl}/instance/connectionState/${evolutionInstance}`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) {
        return { error: "INSTANCE_NOT_FOUND", state: "unknown" };
      }
      return { error: "API_ERROR", state: "unknown" };
    }
    const data = await res.json();
    // Evo API returns: { instance: { state: "open" | "close" | "connecting" } }
    return { error: null, state: data.instance?.state || "unknown", data };
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
    const url = `${evolutionUrl}/instance/connect/${evolutionInstance}`;
    // Pode retornar { base64: "...", count: 1 } se deslogado
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) {
      if(res.status === 404) {
         // Instância precisa ser criada
         return { error: "INSTANCE_NOT_FOUND", base64: null };
      }
      return { error: "API_ERROR", base64: null };
    }
    const data = await res.json();
    return { error: null, base64: data.base64 || null };
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
        instanceName: evolutionInstance,
        token: evolutionKey, // Opcional, forcar token proprio
        qrcode: true
      })
    });
    if (!res.ok) return { error: "CREATE_FAILED" };
    return { error: null, success: true };
  } catch (error) {
    console.error("Evolution create instance error:", error);
    return { error: "FETCH_ERROR" };
  }
}
