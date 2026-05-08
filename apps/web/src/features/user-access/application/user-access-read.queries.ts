import { notFound } from "next/navigation";
import type {
  UserAccessAdminViewData,
  UserAccessCompanyOption,
  UserAccessEditViewData,
  UserAccessListItem,
} from "@dosc-syspro/contracts/user";
import { trpc } from "@/lib/api/trpc-client";

type ActionError = { error: string };

export async function getUsersAdminViewData(): Promise<
  | UserAccessAdminViewData
  | ActionError
> {
  try {
    const [users, companies] = await Promise.all([
      trpc.users.list.query({}),
      trpc.companies.getOptions.query(),
    ]);

    const isGlobalView = (users as UserAccessListItem[]).some((user) =>
      user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE",
    );

    return {
      companies: companies as UserAccessCompanyOption[],
      users: users as UserAccessListItem[],
      isGlobalView,
    };
  } catch {
    return { error: "Erro ao buscar usuarios." };
  }
}

export async function getUserEditViewData(userId: string): Promise<UserAccessEditViewData> {
  const [user, companies] = await Promise.all([
    trpc.users.getOne.query({ id: userId }).catch(() => notFound()),
    trpc.companies.getOptions.query(),
  ]);

  const isSystemUser = user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE";

  return {
    context: isSystemUser ? "SYSTEM" : "CLIENT",
    userId: user.id,
    companies: companies as UserAccessCompanyOption[],
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
