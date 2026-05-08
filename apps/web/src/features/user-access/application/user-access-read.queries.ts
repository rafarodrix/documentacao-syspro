import { notFound } from "next/navigation";
import type {
  UserAccessAdminViewData,
  UserAccessCompanyOption,
  UserAccessEditViewData,
  UserAdminView,
} from "@dosc-syspro/contracts/user";
import { trpc } from "@/lib/api/trpc-client";

type ActionError = { error: string };

export async function getUsersAdminViewData(): Promise<
  | UserAccessAdminViewData
  | ActionError
> {
  try {
    const [users, companies, adminView] = await Promise.all([
      trpc.users.list.query({}),
      trpc.companies.getOptions.query(),
      trpc.users.getAdminView.query() as Promise<UserAdminView>,
    ]);

    return {
      companies: companies as UserAccessCompanyOption[],
      users,
      isGlobalView: Boolean(adminView?.isGlobalView),
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

  const hasInternalRole = user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE";

  return {
    context: hasInternalRole ? "SYSTEM" : "CLIENT",
    userId: user.id,
    companies: companies as UserAccessCompanyOption[],
    isAdmin: hasInternalRole,
    initialData: {
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      contactId: user.contact?.id ?? "",
      password: "",
    },
  };
}
