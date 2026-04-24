import { notFound } from "next/navigation";
import type {
  UserAccessAdminViewData,
  UserAccessCompanyOption,
  UserAccessEditViewData,
} from "@dosc-syspro/contracts/user";
import { mapClientUserListItem, type UserListSelectResult } from "@/features/user-access/domain/selects";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";
import { headers } from "next/headers";


type ActionError = { error: string };

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

export async function getUsersAdminViewData(): Promise<
  | UserAccessAdminViewData
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
      ? ((await companiesResponse.json()) as UserAccessCompanyOption[])
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

export async function getUserEditViewData(userId: string): Promise<UserAccessEditViewData> {
  const [userResponse, companiesResponse] = await Promise.all([
    apiRequest(`/users/${encodeURIComponent(userId)}`),
    apiRequest("/companies/options"),
  ]);

  if (!userResponse.ok) notFound();

  const user = (await userResponse.json()) as UserListSelectResult;
  const companies = companiesResponse.ok
    ? ((await companiesResponse.json()) as UserAccessCompanyOption[])
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
