import {
  getCurrentUserAuthorizationContext,
  resolveCurrentUserCompanyAccessScope,
} from "@/features/user-access/application/current-user-access";
import type { RemoteTenantScope } from "@/features/remote/domain/model";

export async function getRemoteTenantScope(): Promise<RemoteTenantScope> {
  const context = await getCurrentUserAuthorizationContext();
  const session = context?.session ?? null;

  if (!session) {
    return {
      role: "CLIENTE_ADMIN",
      isGlobalView: false,
      companyIds: [],
      companyCount: 0,
      summary: "Sessao ausente. Escopo remoto indisponivel.",
    };
  }

  const companyScope = await resolveCurrentUserCompanyAccessScope("companies:view_own", "companies:view_all");

  if (companyScope.isGlobalView) {
    return {
      role: session.role === "ADMIN" ? "ADMIN" : session.role === "SUPORTE" ? "SUPORTE" : "DEVELOPER",
      isGlobalView: true,
      companyIds: [],
      companyCount: 0,
      summary: "Visao global liberada para operacao tecnica.",
    };
  }

  const companyIds = companyScope.companyIds;

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
