"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import type { RemoteModuleSettings, RemoteModuleSettingsActionResponse } from "@/features/remote/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

export const REMOTE_MODULE_SETTINGS_KEY = "remote.module.settings";

export const remoteModuleSettingsSchema = z.object({
  rustDeskServerHost: z.string().trim().min(3, "Informe o host do servidor RustDesk."),
  rustDeskServerConfig: z.string().trim().min(10, "Informe a configuracao exportada do RustDesk."),
  rustDeskPublicKey: z.string().trim().optional().default(""),
  rustDeskVersion: z.string().trim().min(3, "Informe a versao alvo do RustDesk."),
  heartbeatIntervalMinutes: z.coerce.number().int().min(1, "Minimo de 1 minuto.").max(120, "Maximo de 120 minutos."),
  defaultPassword: z.string().trim().min(4, "Informe a senha padrao do agente."),
});

const REMOTE_MODULE_SETTINGS_DEFAULTS: RemoteModuleSettings = {
  rustDeskServerHost: "acesso.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey: "",
  rustDeskVersion: "1.4.6",
  heartbeatIntervalMinutes: 5,
  defaultPassword: "Trilink098",
};

export function getDefaultRemoteModuleSettings(): RemoteModuleSettings {
  return { ...REMOTE_MODULE_SETTINGS_DEFAULTS };
}

export async function getRemoteModuleSettingsSnapshot(): Promise<RemoteModuleSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: REMOTE_MODULE_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return getDefaultRemoteModuleSettings();
    }

    const parsed = JSON.parse(setting.value);
    const validation = remoteModuleSettingsSchema.safeParse(parsed);
    if (!validation.success) {
      return getDefaultRemoteModuleSettings();
    }

    return validation.data;
  } catch {
    return getDefaultRemoteModuleSettings();
  }
}

export async function getRemoteModuleSettingsAction(): Promise<RemoteModuleSettingsActionResponse<RemoteModuleSettings>> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  const data = await getRemoteModuleSettingsSnapshot();
  return { success: true, data };
}

export async function updateRemoteModuleSettingsAction(
  input: RemoteModuleSettings
): Promise<RemoteModuleSettingsActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  const validation = remoteModuleSettingsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    await prisma.systemSetting.upsert({
      where: { key: REMOTE_MODULE_SETTINGS_KEY },
      update: { value: JSON.stringify(validation.data) },
      create: {
        key: REMOTE_MODULE_SETTINGS_KEY,
        value: JSON.stringify(validation.data),
        description: "Configuracoes globais do modulo remoto",
      },
    });

    revalidatePath("/portal/configuracoes");
    revalidatePath("/portal/plataforma-remota");
    return { success: true, message: "Configuracoes do modulo remoto salvas." };
  } catch (error) {
    console.error("Erro ao salvar configuracoes do modulo remoto:", error);
    return { success: false, error: "Erro ao salvar configuracoes do modulo remoto." };
  }
}
