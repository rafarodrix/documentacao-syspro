import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { getTarefasItemsQuery } from "@/features/tarefas/application/tarefas-read.queries";
import { TarefasPage } from "@/features/tarefas/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { TASK_STATUS_VALUES, TASK_TYPE_VALUES } from "@dosc-syspro/contracts/tarefas";

interface TarefasPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const TASK_ORIGIN_VALUES = ["ALL", "MONTHLY", "MANUAL", "TICKET"] as const;
const TASK_LIST_STATUS_VALUES = [...TASK_STATUS_VALUES, "ALL", "OPEN"] as const;

function readEnumParam<T extends string>(value: string, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
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
  const yearParam = resolvedSearchParams.year;
  const monthParam = resolvedSearchParams.month;
  const originParam = resolvedSearchParams.origin;
  const dueFromParam = resolvedSearchParams.dueFrom;
  const dueToParam = resolvedSearchParams.dueTo;
  const companyIdParam = resolvedSearchParams.companyId;
  const newTaskParam = resolvedSearchParams.newTask;
  const pageValue = typeof pageParam === "string" ? Number(pageParam) : Array.isArray(pageParam) ? Number(pageParam[0]) : 1;
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const search = typeof searchParam === "string" ? searchParam : Array.isArray(searchParam) ? searchParam[0] ?? "" : "";
  const statusValue = typeof statusParam === "string" ? statusParam : Array.isArray(statusParam) ? statusParam[0] ?? "OPEN" : "OPEN";
  const typeValue = typeof typeParam === "string" ? typeParam : Array.isArray(typeParam) ? typeParam[0] ?? "ALL" : "ALL";
  const originValue = typeof originParam === "string" ? originParam : Array.isArray(originParam) ? originParam[0] ?? "ALL" : "ALL";
  const status = readEnumParam(statusValue, TASK_LIST_STATUS_VALUES, "OPEN");
  const type = readEnumParam(typeValue, [...TASK_TYPE_VALUES, "ALL"], "ALL");
  const origin = readEnumParam(originValue, TASK_ORIGIN_VALUES, "ALL");

  const now = new Date();
  const year = typeof yearParam === "string" ? yearParam : Array.isArray(yearParam) ? yearParam[0] ?? String(now.getFullYear()) : String(now.getFullYear());
  const month = typeof monthParam === "string" ? monthParam : Array.isArray(monthParam) ? monthParam[0] ?? String(now.getMonth() + 1) : String(now.getMonth() + 1);
  const dueFrom = typeof dueFromParam === "string" ? dueFromParam : Array.isArray(dueFromParam) ? dueFromParam[0] ?? "" : "";
  const dueTo = typeof dueToParam === "string" ? dueToParam : Array.isArray(dueToParam) ? dueToParam[0] ?? "" : "";
  const companyId =
    typeof companyIdParam === "string" ? companyIdParam : Array.isArray(companyIdParam) ? companyIdParam[0] ?? "" : "";
  const shouldOpenNewTask =
    typeof newTaskParam === "string"
      ? newTaskParam === "true" || newTaskParam === "1"
      : Array.isArray(newTaskParam)
        ? newTaskParam[0] === "true" || newTaskParam[0] === "1"
        : false;

  const tasks = await getTarefasItemsQuery({
    page: String(page),
    pageSize: "20",
    year,
    month,
    type,
    origin,
    dueFrom,
    dueTo,
    reconcileCurrentCompetence: true,
    search,
    status,
    companyId,
  });

  return (
    <TarefasPage
      tasks={tasks}
      search={search}
      status={status}
      type={type}
      origin={origin}
      year={year}
      month={month}
      dueFrom={dueFrom}
      dueTo={dueTo}
      canManage={canManage}
      initialCreateDialogOpen={shouldOpenNewTask}
      initialCreateCompanyId={companyId || undefined}
    />
  );
}
