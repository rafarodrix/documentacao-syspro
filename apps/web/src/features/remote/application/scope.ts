import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import type { RemoteTenantScope } from "@/features/remote/domain/model";

export async function getRemoteTenantScope(): Promise<RemoteTenantScope> {
  const session = await getProtectedSession();

  if (!session) {
    return {
      role: "CLIENTE_ADMIN",
      isGlobalView: false,
      companyIds: [],
      companyCount: 0,
      summary: "Sessao ausente. Escopo remoto indisponivel.",
    };
  }

  if (session.role === Role.ADMIN || session.role === Role.SUPORTE || session.role === Role.DEVELOPER) {
    return {
      role:
        session.role === Role.ADMIN
          ? "ADMIN"
          : session.role === Role.SUPORTE
            ? "SUPORTE"
            : "DEVELOPER",
      isGlobalView: true,
      companyIds: [],
      companyCount: 0,
      summary: "Visao global liberada para operacao tecnica.",
    };
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId },
    select: { companyId: true },
  });

  const companyIds = [...new Set(memberships.map((membership) => membership.companyId))];

  return {
    role: "CLIENTE_ADMIN",
    isGlobalView: false,
    companyIds,
    companyCount: companyIds.length,
    summary: companyIds.length
      ? `Escopo restrito a ${companyIds.length} empresa(s) vinculada(s) ao usuario.`
      : "Nenhuma empresa vinculada para escopo remoto.",
  };
}
