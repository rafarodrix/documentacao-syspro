import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { getCompanyOptionsQuery } from "@/features/company/application/company-read.queries";
import { trpc } from "@/lib/api/trpc-client";
import type { UserAdminView } from "@dosc-syspro/contracts/user";

export default async function CadastrosUsuariosNovoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;

  const [companies, adminView] = await Promise.all([
    getCompanyOptionsQuery(),
    trpc.users.getAdminView.query() as Promise<UserAdminView>,
  ]);
  if (!adminView.assignableProfiles.length) return <CadastrosAccessDenied />;

  return (
    <CreateUserPageForm
      companies={companies}
      assignableProfiles={adminView.assignableProfiles}
      backHref="/portal/cadastros/usuarios"
    />
  );
}
