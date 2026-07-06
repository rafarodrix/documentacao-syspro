"use server";

import { revalidatePath } from "next/cache";
import { remoteModuleSettingsSchema } from "@dosc-syspro/contracts/remote";
import {
  toDataActionResponse,
  toMessageActionResponse,
} from "@/lib/server-action-api";
import type { RemoteModuleSettings, RemoteModuleSettingsActionResponse } from "@/features/remote/domain/remote-host.types";
import {
  fetchRemoteModuleSettingsGateway,
  updateRemoteModuleSettingsGateway,
} from "@/features/settings/infrastructure/gateways/settings.gateway";

export async function getRemoteModuleSettingsAction(): Promise<RemoteModuleSettingsActionResponse<RemoteModuleSettings>> {
  try {
    return toDataActionResponse(await fetchRemoteModuleSettingsGateway(), "Permissao negada.");
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
    const result = toMessageActionResponse(
      await updateRemoteModuleSettingsGateway(validation.data),
      "Erro ao salvar configuracoes do modulo remoto.",
      "Configuracoes do modulo remoto salvas.",
    );
    if (!result.success) return result;

    revalidatePath("/portal/configuracoes");
    revalidatePath("/portal/infraestrutura");
    return result;
  } catch (error) {
    console.error("Erro ao salvar configuracoes do modulo remoto:", error);
    return { success: false, error: "Erro ao salvar configuracoes do modulo remoto." };
  }
}
