"use server";

import type { CreateUserInput, UpdateUserInput } from "@dosc-syspro/contracts/user";
import { handleActionError } from "@dosc-syspro/shared";
import { trpc } from "@/lib/api/trpc-client";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import type { UserAccessActionResponse } from "@/features/user-access/domain/user-access.types";

export async function createUserAction(data: CreateUserInput): Promise<UserAccessActionResponse> {
  try {
    await trpc.users.create.mutate(data);
    revalidateCadastrosViews();
    return { success: true, message: "Usuario cadastrado com sucesso." };
  } catch (error) {
    return handleActionError(error, { defaultMessage: "Erro ao cadastrar usuario." });
  }
}

export async function updateUserAction(id: string, data: UpdateUserInput): Promise<UserAccessActionResponse> {
  try {
    await trpc.users.update.mutate({ id, data });
    revalidateCadastrosViews();
    return { success: true, message: "Usuario atualizado com sucesso." };
  } catch (error) {
    return handleActionError(error, { defaultMessage: "Erro ao atualizar usuario." });
  }
}

export async function updateUserStatusAction(id: string, isActive: boolean): Promise<UserAccessActionResponse> {
  try {
    await trpc.users.update.mutate({ id, data: { isActive } });
    revalidateCadastrosViews();
    return { success: true, message: "Status alterado com sucesso." };
  } catch (error) {
    return handleActionError(error, { defaultMessage: "Erro ao alterar status." });
  }
}
