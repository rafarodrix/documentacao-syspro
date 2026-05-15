import { requireSession } from "@/lib/auth-helpers";
import { trpc } from "@/lib/api/trpc-client";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { RotinasMensaisPage } from "@/features/rotinas-mensais/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import type { MonthlyRoutineListResponse } from "@dosc-syspro/contracts/rotinas-mensais";

interface RotinasMensaisPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RotinasMensaisRootPage({ searchParams }: RotinasMensaisPageProps) {
  await requireSession();

  const canView = await currentUserHasAnyPermission(["rotinas_mensais:view", "rotinas_mensais:view_all", "rotinas_mensais:manage"], {
    acceptCompanyScope: true,
  });

  if (!canView) return <CadastrosAccessDenied />;

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const searchParam = resolvedSearchParams.search;
  const search = typeof searchParam === "string" ? searchParam : Array.isArray(searchParam) ? searchParam[0] ?? "" : "";

  const data = await (trpc.rotinasMensais.list.query({
    page: "1",
    pageSize: "20",
    search,
  }) as Promise<MonthlyRoutineListResponse>);

  return <RotinasMensaisPage data={data} search={search} />;
}
