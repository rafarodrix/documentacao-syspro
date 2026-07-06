"use server";

import type { SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { getProtectedSession } from "@/lib/auth-helpers";
import { callWebApi } from "@/lib/web-api";
import {
  currentUserHasAnyPermission,
  currentUserHasPermission,
} from "@/features/user-access/application/current-user-access";

type PermissionCheckOptions = {
  acceptCompanyScope?: boolean;
};

type ActionFailure = {
  success: false;
  error: string;
};

type GatewayResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export function createWebApiRequest(basePath: string) {
  return (path = "", init?: RequestInit) => callWebApi(`${basePath}${path}`, init);
}

export async function canAccessServerAction(
  permission: SettingsPermissionKey | SettingsPermissionKey[],
  options?: PermissionCheckOptions,
) {
  const session = await getProtectedSession();
  if (!session) {
    return false;
  }

  if (Array.isArray(permission)) {
    return currentUserHasAnyPermission(permission, options);
  }

  return currentUserHasPermission(permission, options);
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

export async function parseActionResponse<T extends { success?: boolean; error?: string }>(
  response: Response,
  fallbackError: string,
): Promise<T | ActionFailure> {
  const payload = await readJsonResponse<Partial<T>>(response);

  if (response.ok && payload?.success) {
    return payload as T;
  }

  if (payload?.success === false && typeof payload.error === "string") {
    return { success: false, error: payload.error };
  }

  return { success: false, error: fallbackError };
}

export function toDataActionResponse<T>(
  response: GatewayResponse<T>,
  fallbackError: string,
): { success: true; data: T } | ActionFailure {
  if (!response.success || response.data === undefined) {
    return { success: false, error: response.error || fallbackError };
  }

  return { success: true, data: response.data };
}

export function toMessageActionResponse(
  response: GatewayResponse<unknown>,
  fallbackError: string,
  fallbackMessage: string,
): { success: true; message: string } | ActionFailure {
  if (!response.success) {
    return { success: false, error: response.error || fallbackError };
  }

  return { success: true, message: response.message || fallbackMessage };
}

export function requireGatewayData<T>(
  response: GatewayResponse<T>,
  fallbackError: string,
): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || fallbackError);
  }

  return response.data;
}
