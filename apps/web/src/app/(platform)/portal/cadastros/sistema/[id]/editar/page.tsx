import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getSystemUserEditViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosSistemaEditarPage({ params }: PageProps) {
  await requireSession();

  if (!(await currentUserHasPermission("system_team:manage"))) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getSystemUserEditViewData(id);

  return (
    <CreateUserPageForm
      mode="edit"
      userId={view.userId}
      companies={[]}
      context="SYSTEM"
      isAdmin
      backHref="/portal/cadastros/sistema"
      initialData={view.initialData}
    />
  );
}
