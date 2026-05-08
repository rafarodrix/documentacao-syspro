"use server";

import { createUserSchema, updateUserSchema, type CreateUserInput } from "@dosc-syspro/contracts/user";
import { getProtectedSession } from "@/lib/auth-helpers";
import { z } from "zod";
import { consumeActionRateLimit } from "@dosc-syspro/shared/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import type { UserAccessActionResponse, UserAccessValidationErrors } from "@/features/user-access/domain/user-access.types";
import { handleActionError } from "@dosc-syspro/shared/action-error-handler";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { trpc } from "@/lib/api/trpc-client";

interface GetUsersParams {
  search?: string;
  role?: string;
}

const CREATE_USER_RATE_LIMIT = { max: 8, windowMs: 60_000 };

function toValidationErrors(
  fieldErrors:
    | z.inferFlattenedErrors<typeof createUserSchema>["fieldErrors"]
    | z.inferFlattenedErrors<typeof updateUserSchema>["fieldErrors"],
): UserAccessValidationErrors {
  return fieldErrors as UserAccessValidationErrors;
}

type UserUpsertInput = CreateUserInput;

export async function getUsersAction(filters?: GetUsersParams) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, message: "Nao autorizado." };
  }

  try {
    const data = await trpc.users.list.query({
      search: filters?.search,
      role: filters?.role,
    });
    return { success: true, data };
  } catch {
    return { success: false, message: "Erro ao carregar usuarios." };
  }
}

export async function createUserAction(data: UserUpsertInput): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, message: "Permissao negada." };

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) {
    return { success: false, message: "Permissao negada." };
  }

  const validation = createUserSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: toValidationErrors(validation.error.flatten().fieldErrors),
      message: "Dados invalidos.",
    };
  }

  const ip = await getRequestIp();
  const rateLimit = consumeActionRateLimit({
    action: "createUserAction",
    max: CREATE_USER_RATE_LIMIT.max,
    windowMs: CREATE_USER_RATE_LIMIT.windowMs,
    userId: session.userId,
    ip,
  });
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Muitas tentativas. Aguarde ${rateLimit.retryAfterSeconds}s e tente novamente.`,
    };
  }

  try {
    await trpc.users.create.mutate(validation.data);
    revalidateCadastrosViews();
    return { success: true, message: "Usuario criado com sucesso!" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateUserAction(id: string, data: Partial<UserUpsertInput>): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, message: "Acesso negado." };

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) {
    return { success: false, message: "Acesso negado." };
  }

  const updateValidation = updateUserSchema.safeParse(data);
  if (!updateValidation.success) {
    return {
      success: false,
      errors: toValidationErrors(updateValidation.error.flatten().fieldErrors),
      message: "Dados invalidos.",
    };
  }

  try {
    await trpc.users.update.mutate({ id, data: updateValidation.data });
    revalidateCadastrosViews();
    return { success: true, message: "Usuario atualizado com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteUserAction(id: string): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session || id === session.userId) return { success: false, message: "Operacao invalida." };

  if (!(await currentUserHasPermission("users:status", { acceptCompanyScope: true }))) {
    return { success: false, message: "Acesso negado." };
  }

  try {
    await trpc.users.remove.mutate({ id });
    revalidateCadastrosViews();
    return { success: true, message: "Removido com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleUserStatusAction(id: string, active: boolean): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, message: "Acesso negado." };

  if (!(await currentUserHasPermission("users:status", { acceptCompanyScope: true }))) {
    return { success: false, message: "Acesso negado." };
  }

  try {
    await trpc.users.update.mutate({ id, data: { isActive: active } });
    revalidateCadastrosViews();
    return { success: true, message: `Usuario ${active ? "ativado" : "desativado"} com sucesso.` };
  } catch (error) {
    return handleActionError(error);
  }
}
