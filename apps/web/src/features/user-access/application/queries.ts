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

export async function getUsersAdminViewData(): Promise<
  | { companies: ClientUserEditViewData["companies"]; users: UserAccessListItem[]; isGlobalView: boolean }
  | ActionError
> {
  try {
    const [usersResponse, companiesResponse] = await Promise.all([
      apiRequest("/users"),
      apiRequest("/companies/options"),
    ]);

    if (!usersResponse.ok) {
      return { error: "Erro ao buscar usuarios." };
    }

    const usersPayload = (await usersResponse.json()) as UserListSelectResult[];
    const companiesPayload = companiesResponse.ok
      ? ((await companiesResponse.json()) as ClientUserEditViewData["companies"])
      : [];

    const isGlobalView = usersPayload.some((user) =>
      user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE",
    );

    return {
      companies: companiesPayload,
      users: usersPayload.map(mapClientUserListItem),
      isGlobalView,
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

export async function getUserEditViewData(userId: string): Promise<ClientUserEditViewData & { context: "CLIENT" | "SYSTEM" }> {
  const [userResponse, companiesResponse] = await Promise.all([
    apiRequest(`/users/${encodeURIComponent(userId)}`),
    apiRequest("/companies/options"),
  ]);

  if (!userResponse.ok) notFound();

  const user = (await userResponse.json()) as UserListSelectResult;
  const companies = companiesResponse.ok
    ? ((await companiesResponse.json()) as ClientUserEditViewData["companies"])
    : [];
  const isSystemUser = user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE";

  return {
    context: isSystemUser ? "SYSTEM" : "CLIENT",
    userId: user.id,
    companies,
    isAdmin: isSystemUser,
    initialData: {
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      contactId: user.contact?.id ?? "",
      password: "",
    },
  };
}
