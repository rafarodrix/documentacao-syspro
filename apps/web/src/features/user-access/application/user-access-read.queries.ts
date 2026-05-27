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
      assignableProfiles: adminView?.assignableProfiles ?? [],
    };
  } catch {
    return { error: "Erro ao buscar usuarios." };
  }
}

export async function getUserEditViewData(userId: string): Promise<UserAccessEditViewData> {
  const [user, companies, adminView] = await Promise.all([
    trpc.users.getOne.query({ id: userId }).catch(() => notFound()),
    trpc.companies.getOptions.query(),
    trpc.users.getAdminView.query() as Promise<UserAdminView>,
  ]);

  return {
    userId: user.id,
    companies: companies as UserAccessCompanyOption[],
    assignableProfiles: adminView.assignableProfiles,
    initialData: {
      name: user.name ?? "",
      email: user.email,
      profileKey: user.role,
      companyIds: (user.memberships ?? []).map((membership) => membership.companyId),
      contactId: user.contact?.id ?? "",
      password: "",
    },
  };
}
