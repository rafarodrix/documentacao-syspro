import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { CreateUserPageForm } from "@/components/platform/cadastros/user/CreateUserPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];

export default async function CadastrosSistemaEditarPage({ params }: PageProps) {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.sistema.allowed] as Role[],
    CADASTROS_ROUTE_RULES.sistema.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "system_team:manage")) return <CadastrosAccessDenied />;
  if (session.role !== Role.ADMIN) return <CadastrosAccessDenied />;

  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
      role: { in: SYSTEM_ROLES },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      phone: true,
      cpf: true,
    },
  });

  if (!user) return notFound();

  return (
    <CreateUserPageForm
      mode="edit"
      userId={user.id}
      companies={[]}
      context="SYSTEM"
      isAdmin
      backHref="/app/cadastros/sistema"
      initialData={{
        name: user.name ?? "",
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle ?? "",
        phone: user.phone ?? "",
        cpf: user.cpf ?? "",
        password: "",
      }}
    />
  );
}

