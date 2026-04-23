"use server";

import { headers } from "next/headers";
import { createUserSchema, updateUserSchema, type CreateUserInput } from "@dosc-syspro/contracts/user";
import { getProtectedSession } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { z } from "zod";
import { consumeActionRateLimit } from "@dosc-syspro/shared/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import type { UserAccessActionResponse, UserAccessValidationErrors } from "@/features/user-access/domain/model";
import { SYSTEM_ROLES } from "@/features/user-access/domain/constants";
import { handleActionError } from "@dosc-syspro/shared/action-error-handler";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

interface GetUsersParams {
  search?: string;
  role?: string;
}

const CREATE_USER_RATE_LIMIT = { max: 8, windowMs: 60_000 };

type ApiErrorResponse = {
  message?: string | string[];
};

function toValidationErrors(
  fieldErrors:
    | z.inferFlattenedErrors<typeof createUserSchema>["fieldErrors"]
    | z.inferFlattenedErrors<typeof updateUserSchema>["fieldErrors"],
): UserAccessValidationErrors {
  return fieldErrors as UserAccessValidationErrors;
}

function toApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const body = payload as ApiErrorResponse;
  if (Array.isArray(body.message) && body.message.length > 0) return body.message.join(", ");
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

async function callApi(path: string, init?: RequestInit) {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  return fetch(`${getBackendApiBaseUrl()}${path}`, {
    ...init,
    headers: withInternalApiHeaders({
      ...(cookie ? { cookie } : {}),
      ...(init?.headers ?? {}),
    }),
    cache: "no-store",
  });
}

export async function getUsersAction(filters?: GetUsersParams) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, message: "Nao autorizado." };
  }

  try {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.role) params.set("role", filters.role);

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await callApi(`/users${suffix}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return { success: false, message: toApiErrorMessage(payload, "Erro ao carregar usuarios.") };
    }

    const data = await response.json();
    return { success: true, data };
  } catch {
    return { success: false, message: "Erro ao carregar usuarios." };
  }
}

type UserUpsertInput = CreateUserInput;

export async function createUserAction(data: UserUpsertInput): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, message: "Permissao negada." };

  const isSystemRole = SYSTEM_ROLES.includes(session.role);
  const isClientManager = session.role === Role.CLIENTE_ADMIN;
  if (!isSystemRole && !isClientManager) return { success: false, message: "Permissao negada." };

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
    const response = await callApi("/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: validation.data.email,
        password: validation.data.password || data.password,
        name: validation.data.name,
        role: validation.data.role as Role,
        contactId: validation.data.contactId || null,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return { success: false, message: toApiErrorMessage(payload, "Falha na criacao da conta.") };
    }

    revalidateCadastrosViews();
    return { success: true, message: "Usuario criado com sucesso!" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateUserAction(id: string, data: Partial<UserUpsertInput>): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, message: "Acesso negado." };

  const isSystemRole = SYSTEM_ROLES.includes(session.role);
  const isClientManager = session.role === Role.CLIENTE_ADMIN;
  if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };

  const updateValidation = updateUserSchema.safeParse(data);
  if (!updateValidation.success) {
    return {
      success: false,
      errors: toValidationErrors(updateValidation.error.flatten().fieldErrors),
      message: "Dados invalidos.",
    };
  }

  try {
    const response = await callApi(`/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(updateValidation.data),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return { success: false, message: toApiErrorMessage(payload, "Falha ao atualizar usuario.") };
    }

    revalidateCadastrosViews();
    return { success: true, message: "Usuario atualizado com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteUserAction(id: string): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session || id === session.userId) return { success: false, message: "Operacao invalida." };

  const isSystemRole = SYSTEM_ROLES.includes(session.role);
  const isClientManager = session.role === Role.CLIENTE_ADMIN;
  if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };

  try {
    const response = await callApi(`/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return { success: false, message: toApiErrorMessage(payload, "Falha ao remover usuario.") };
    }

    revalidateCadastrosViews();
    return { success: true, message: "Removido com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleUserStatusAction(id: string, active: boolean): Promise<UserAccessActionResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, message: "Acesso negado." };

  const isSystemRole = SYSTEM_ROLES.includes(session.role);
  const isClientManager = session.role === Role.CLIENTE_ADMIN;
  if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };

  try {
    const response = await callApi(`/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ isActive: active }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return { success: false, message: toApiErrorMessage(payload, "Falha ao atualizar status do usuario.") };
    }

    revalidateCadastrosViews();
    return { success: true, message: `Usuario ${active ? "ativado" : "desativado"} com sucesso.` };
  } catch (error) {
    return handleActionError(error);
  }
}
