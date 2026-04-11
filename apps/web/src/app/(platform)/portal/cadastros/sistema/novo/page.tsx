import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosSistemaNovoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("system_team:manage"))) return <CadastrosAccessDenied />;

  return (
    <CreateUserPageForm
      companies={[]}
      context="SYSTEM"
      isAdmin
      backHref="/portal/cadastros/sistema"
    />
  );
}
