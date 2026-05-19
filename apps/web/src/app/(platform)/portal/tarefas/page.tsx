import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { getTarefasItemsQuery } from "@/features/tarefas/application/tarefas-read.queries";
import { TarefasPage } from "@/features/tarefas/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

interface TarefasPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TarefasRootPage({ searchParams }: TarefasPageProps) {
  await requireSession();

  const canView = await currentUserHasAnyPermission(["tarefas:view", "tarefas:view_all", "tarefas:manage"], {
    acceptCompanyScope: true,
  });

  if (!canView) return <CadastrosAccessDenied />;

  const canManage = await currentUserHasAnyPermission(["tarefas:manage"], {
    acceptCompanyScope: true,
  });

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const pageParam = resolvedSearchParams.page;
  const searchParam = resolvedSearchParams.search;
  const statusParam = resolvedSearchParams.status;
  const typeParam = resolvedSearchParams.type;
  const pageValue = typeof pageParam === "string" ? Number(pageParam) : Array.isArray(pageParam) ? Number(pageParam[0]) : 1;
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const search = typeof searchParam === "string" ? searchParam : Array.isArray(searchParam) ? searchParam[0] ?? "" : "";
  const status = typeof statusParam === "string" ? statusParam : Array.isArray(statusParam) ? statusParam[0] ?? "OPEN" : "OPEN";
  const type = typeof typeParam === "string" ? typeParam : Array.isArray(typeParam) ? typeParam[0] ?? "ALL" : "ALL";

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1);

  const tasks = await getTarefasItemsQuery({
    page: String(page),
    pageSize: "20",
    year,
    month,
    type,
    search,
    status,
  });

  return <TarefasPage tasks={tasks} search={search} status={status} type={type} canManage={canManage} />;
}
