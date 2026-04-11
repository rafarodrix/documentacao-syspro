import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getClientUserEditViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  await requireSession();

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getClientUserEditViewData(id);

  return (
    <CreateUserPageForm
      mode="edit"
      userId={view.userId}
      companies={view.companies}
      context="CLIENT"
      isAdmin={view.isAdmin}
      backHref="/portal/cadastros/usuarios"
      initialData={view.initialData}
    />
  );
}
