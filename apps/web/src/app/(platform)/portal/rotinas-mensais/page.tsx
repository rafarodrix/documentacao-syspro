import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { getMonthlyRoutineCompetenciesQuery, getMonthlyRoutineListQuery } from "@/features/rotinas-mensais/application/rotinas-mensais-read.queries";
import { RotinasMensaisPage } from "@/features/rotinas-mensais/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

interface RotinasMensaisPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RotinasMensaisRootPage({ searchParams }: RotinasMensaisPageProps) {
  await requireSession();

  const canView = await currentUserHasAnyPermission(["rotinas_mensais:view", "rotinas_mensais:view_all", "rotinas_mensais:manage"], {
    acceptCompanyScope: true,
  });

  if (!canView) return <CadastrosAccessDenied />;
  const canManage = await currentUserHasAnyPermission(["rotinas_mensais:manage"], {
    acceptCompanyScope: true,
  });

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const searchParam = resolvedSearchParams.search;
  const search = typeof searchParam === "string" ? searchParam : Array.isArray(searchParam) ? searchParam[0] ?? "" : "";

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1);
  const [data, competencies] = await Promise.all([
    getMonthlyRoutineListQuery({
      page: "1",
      pageSize: "20",
      search,
    }),
    getMonthlyRoutineCompetenciesQuery({
      page: "1",
      pageSize: "12",
      year,
      month,
      search,
    }),
  ]);

  return <RotinasMensaisPage data={data} competencies={competencies} search={search} canManage={canManage} />;
}
