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

const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];

export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.usuarios.allowed] as Role[],
    CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "users:edit")) return <CadastrosAccessDenied />;

  const { id } = await params;
  const managedCompanyIds =
    session.role === Role.CLIENTE_ADMIN
      ? (
          await prisma.membership.findMany({
            where: { userId: session.userId },
            select: { companyId: true },
          })
        ).map((m) => m.companyId)
      : null;

  const user = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
      role: { in: CLIENT_ROLES },
      ...(session.role === Role.CLIENTE_ADMIN
        ? { memberships: { some: { companyId: { in: managedCompanyIds?.length ? managedCompanyIds : ["__none__"] } } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      phone: true,
      cpf: true,
      memberships: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!user) return notFound();

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(session.role === Role.CLIENTE_ADMIN ? { id: { in: managedCompanyIds?.length ? managedCompanyIds : ["__none__"] } } : {}),
    },
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
    },
  });

  return (
    <CreateUserPageForm
      mode="edit"
      userId={user.id}
      companies={companies}
      context="CLIENT"
      isAdmin={session.role !== Role.CLIENTE_ADMIN}
      backHref="/app/cadastros/usuarios"
      initialData={{
        name: user.name ?? "",
        email: user.email,
        role: user.role,
        companyId: user.memberships[0]?.companyId ?? "",
        additionalCompanyIds: user.memberships.slice(1).map((membership) => membership.companyId),
        jobTitle: user.jobTitle ?? "",
        phone: user.phone ?? "",
        cpf: user.cpf ?? "",
        password: "",
      }}
    />
  );
}
