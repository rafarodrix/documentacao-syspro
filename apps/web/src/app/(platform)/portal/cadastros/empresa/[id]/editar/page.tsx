import { requireSession } from "@/lib/auth-helpers";
import { getCompanyEditViewData } from "@/features/company/application/company-read.queries";
import { CreateCompanyPageForm } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { getTarefasCompanyConfigQuery } from "@/features/tarefas/application/tarefas-read.queries";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CadastrosEmpresaEditarPage({ params, searchParams }: PageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("companies:edit", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const returnToParam = query?.returnTo;
  const backHref =
    typeof returnToParam === "string"
      ? returnToParam
      : Array.isArray(returnToParam)
        ? returnToParam[0] ?? "/portal/cadastros/empresa"
        : "/portal/cadastros/empresa";
  const canViewMonthlyRoutine = await currentUserHasAnyPermission(
    ["tarefas:view", "tarefas:view_all", "tarefas:manage"],
    { acceptCompanyScope: true },
  );
  const canManageMonthlyRoutine = await currentUserHasPermission("tarefas:manage", { acceptCompanyScope: true });

  const [view, monthlyRoutineView] = await Promise.all([
    getCompanyEditViewData(id),
    canViewMonthlyRoutine ? getTarefasCompanyConfigQuery(id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <CreateCompanyPageForm
      mode="edit"
      companyId={view.companyId}
      canEditCnpj={view.canEditCnpj}
      backHref={backHref}
      companies={view.companies}
      initialData={view.initialData}
      monthlyRoutineView={monthlyRoutineView ?? undefined}
      canManageMonthlyRoutine={canManageMonthlyRoutine}
    />
  );
}
