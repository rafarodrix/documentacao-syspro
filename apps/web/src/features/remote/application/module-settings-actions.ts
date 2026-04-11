"use server";

import { revalidatePath } from "next/cache";
import { remoteModuleSettingsSchema } from "@/features/remote/application/module-settings";
import type { RemoteModuleSettings, RemoteModuleSettingsActionResponse } from "@/features/remote/domain/model";
import {
  fetchRemoteModuleSettingsGateway,
  updateRemoteModuleSettingsGateway,
} from "@/features/settings/infrastructure/settings.gateway";

export async function getRemoteModuleSettingsAction(): Promise<RemoteModuleSettingsActionResponse<RemoteModuleSettings>> {
  try {
    const response = await fetchRemoteModuleSettingsGateway();
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Permissao negada." };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao carregar configuracoes do modulo remoto via backend:", error);
    return { success: false, error: "Erro ao carregar configuracoes do modulo remoto." };
  }
}

export async function updateRemoteModuleSettingsAction(
  input: RemoteModuleSettings
): Promise<RemoteModuleSettingsActionResponse> {
  const validation = remoteModuleSettingsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    const response = await updateRemoteModuleSettingsGateway(validation.data);
    if (!response.success) {
      return { success: false, error: response.error || "Erro ao salvar configuracoes do modulo remoto." };
    }

    revalidatePath("/portal/configuracoes");
    revalidatePath("/portal/plataforma-remota");
    return { success: true, message: response.message || "Configuracoes do modulo remoto salvas." };
  } catch (error) {
    console.error("Erro ao salvar configuracoes do modulo remoto:", error);
    return { success: false, error: "Erro ao salvar configuracoes do modulo remoto." };
  }
}
