"use server";

import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  type EvolutionSettingsInput,
} from "@dosc-syspro/contracts/evolution";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export type EvolutionQrCodeResult = {
  instance: string;
  endpoint: string;
  qrCode?: string | null;
  code?: string | null;
  receivedAt?: string | null;
};

export type EvolutionInstanceStatus = {
  configured: boolean;
  instance: string;
  instanceId: string | null;
  status: string;
  event: string | null;
  receivedAt: string | null;
  details: Record<string, unknown>;
};

type EvolutionQrCodeActionResult =
  | { success: true; data: EvolutionQrCodeResult; message: string }
  | { success: false; error: string; message: string };

function unauthorizedResponse() {
  return { success: false, error: "UNAUTHORIZED", settings: DEFAULT_EVOLUTION_SETTINGS };
}

export async function getEvolutionSettingsAction() {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return unauthorizedResponse();
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/settings/evolution`, {
      method: "GET",
      headers: withInternalApiHeaders(),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "BACKEND_ERROR", settings: DEFAULT_EVOLUTION_SETTINGS };
    }

    const parsed = evolutionSettingsSchema.safeParse(data.settings);
    if (!parsed.success) {
      return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
    }

    return { success: true, settings: parsed.data };
  } catch (error) {
    console.error("getEvolutionSettingsAction error:", error);
    return { success: false, error: "BACKEND_ERROR", settings: DEFAULT_EVOLUTION_SETTINGS };
  }
}

export async function updateEvolutionSettingsAction(input: EvolutionSettingsInput) {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return unauthorizedResponse();
  }

  const validation = evolutionSettingsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "INVALID_INPUT", settings: DEFAULT_EVOLUTION_SETTINGS };
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/settings/evolution`, {
      method: "PUT",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(validation.data),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "BACKEND_ERROR", settings: validation.data };
    }

    const parsed = evolutionSettingsSchema.safeParse(data.settings);
    return {
      success: true,
      settings: parsed.success ? parsed.data : validation.data,
      message: "Configuracoes do Evolution salvas.",
    };
  } catch (error) {
    console.error("updateEvolutionSettingsAction error:", error);
    return { success: false, error: "BACKEND_ERROR", settings: validation.data };
  }
}

export async function getEvolutionInstanceStatusAction(): Promise<
  | { success: true; data: EvolutionInstanceStatus }
  | { success: false; error: string; message: string }
> {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { success: false, error: "UNAUTHORIZED", message: "Sessao sem permissao para consultar a Evolution." };
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/settings/evolution/status`, {
      method: "GET",
      headers: withInternalApiHeaders(),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || "BACKEND_ERROR",
        message: data?.message || "Falha ao consultar status da Evolution.",
      };
    }

    return { success: true, data: data.data as EvolutionInstanceStatus };
  } catch (error) {
    console.error("getEvolutionInstanceStatusAction error:", error);
    return { success: false, error: "BACKEND_ERROR", message: "Falha ao consultar status da Evolution." };
  }
}

export async function requestEvolutionQrCodeAction(): Promise<EvolutionQrCodeActionResult> {
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { success: false, error: "UNAUTHORIZED", message: "Sessao sem permissao para gerar QR Code." };
  }

  try {
    const res = await fetch(`${getBackendApiBaseUrl()}/settings/evolution/qrcode`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || "BACKEND_ERROR",
        message: data?.message || "Falha ao gerar QR Code na Evolution.",
      };
    }

    return {
      success: true,
      data: data.data as EvolutionQrCodeResult,
      message: data?.message || "QR Code gerado.",
    };
  } catch (error) {
    console.error("requestEvolutionQrCodeAction error:", error);
    return { success: false, error: "BACKEND_ERROR", message: "Falha ao gerar QR Code na Evolution." };
  }
}
