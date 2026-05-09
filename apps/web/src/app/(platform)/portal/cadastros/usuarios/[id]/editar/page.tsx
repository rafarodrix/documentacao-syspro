import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getUserEditViewData } from "@/features/user-access/application/user-access-read.queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  await requireSession();

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getUserEditViewData(id);
  if (!view.assignableProfiles.some((profile) => profile.key === view.initialData.profileKey)) return <CadastrosAccessDenied />;

  return (
    <CreateUserPageForm
      mode="edit"
      userId={view.userId}
      companies={view.companies}
      assignableProfiles={view.assignableProfiles}
      backHref="/portal/cadastros/usuarios"
      initialData={view.initialData}
    />
  );
}
