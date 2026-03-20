import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { CreateCompanyPageForm } from "@/components/platform/cadastros/company/CreateCompanyPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosEmpresaNovoPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.empresa.allowed] as Role[],
    CADASTROS_ROUTE_RULES.empresa.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "companies:create")) return <CadastrosAccessDenied />;

  return <CreateCompanyPageForm backHref="/app/cadastros/empresa" />;
}
