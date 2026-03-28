"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings-server";
import { REMOTE_MODULE_SETTINGS_KEY, remoteModuleSettingsSchema } from "@/features/remote/application/module-settings";
import type { RemoteModuleSettings, RemoteModuleSettingsActionResponse } from "@/features/remote/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];

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
