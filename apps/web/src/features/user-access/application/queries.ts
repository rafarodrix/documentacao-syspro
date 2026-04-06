import { notFound } from "next/navigation";
import type {
  ClientUserEditViewData,
  SystemUserEditViewData,
  UserAccessListItem,
  SystemUserListItem,
} from "@/features/user-access/domain/model";
import { mapClientUserListItem, mapSystemUserListItem, type UserListSelectResult } from "@/features/user-access/domain/selects";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";
import { headers } from "next/headers";


type ActionError = { error: string };

type ClientAdminViewApiResponse = {
  companies: ClientUserEditViewData["companies"];
  users: UserListSelectResult[];
  isGlobalView: boolean;
};

type SystemAdminViewApiResponse = {
  users: UserListSelectResult[];
  isGlobalView: boolean;
};

async function apiRequest(path: string, init?: RequestInit) {
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

export async function getClientUsersAdminViewData(): Promise<
  | { companies: ClientUserEditViewData["companies"]; users: UserAccessListItem[]; isGlobalView: boolean }
  | ActionError
> {
  try {
    const response = await apiRequest("/users/view/client-admin");
    if (!response.ok) {
      return { error: "Erro ao buscar usuarios." };
    }

    const payload = (await response.json()) as ClientAdminViewApiResponse;
    return {
      companies: payload.companies,
      users: payload.users.map(mapClientUserListItem),
      isGlobalView: payload.isGlobalView,
    };
  } catch {
    return { error: "Erro ao buscar usuarios." };
  }
}

export async function getSystemUsersAdminViewData(): Promise<
  | { users: SystemUserListItem[]; isGlobalView: boolean }
  | ActionError
> {
  try {
    const response = await apiRequest("/users/view/system-admin");
    if (!response.ok) {
      return { error: "Erro ao buscar equipe interna." };
    }

    const payload = (await response.json()) as SystemAdminViewApiResponse;
    return {
      users: payload.users.map(mapSystemUserListItem),
      isGlobalView: payload.isGlobalView,
    };
  } catch {
    return { error: "Erro ao buscar equipe interna." };
  }
}

export async function getClientUserEditViewData(userId: string): Promise<ClientUserEditViewData> {
  const response = await apiRequest(`/users/view/client/${encodeURIComponent(userId)}/edit`);
  if (!response.ok) notFound();

  return (await response.json()) as ClientUserEditViewData;
}

export async function getSystemUserEditViewData(userId: string): Promise<SystemUserEditViewData> {
  const response = await apiRequest(`/users/view/system/${encodeURIComponent(userId)}/edit`);
  if (!response.ok) notFound();

  return (await response.json()) as SystemUserEditViewData;
}
