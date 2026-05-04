import { notFound } from "next/navigation";
import type {
  UserAccessAdminViewData,
  UserAccessCompanyOption,
  UserAccessEditViewData,
  UserAccessListItem,
} from "@dosc-syspro/contracts/user";
import { callWebApi } from "@/lib/web-api";


type ActionError = { error: string };

async function apiRequest(path: string, init?: RequestInit) {
  return callWebApi(`/api${path}`, init);
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

    const usersPayload = (await usersResponse.json()) as UserAccessListItem[];
    const companiesPayload = companiesResponse.ok
      ? ((await companiesResponse.json()) as UserAccessCompanyOption[])
      : [];

    const isGlobalView = usersPayload.some((user) =>
      user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE",
    );

    return {
      companies: companiesPayload,
      users: usersPayload,
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

  const user = (await userResponse.json()) as UserAccessListItem;
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
