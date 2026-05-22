import { prisma, normalizeCompareValue } from "@dosc-syspro/database";

export type ScopedCompanyContext = {
  id: string;
  nomeFantasia: string | null;
  razaoSocial: string;
  displayLabel: string;
  normalizedPrimaryNames: string[];
};

export function buildCompanyDisplayLabel(input: { nomeFantasia: string | null; razaoSocial: string }) {
  const nomeFantasia = input.nomeFantasia?.trim() ?? "";
  const razaoSocial = input.razaoSocial.trim();

  if (!nomeFantasia) return razaoSocial;
  if (normalizeCompareValue(nomeFantasia) === normalizeCompareValue(razaoSocial)) return nomeFantasia;
  return `${nomeFantasia} | ${razaoSocial}`;
}

export async function resolveScopedCompanyContext(input: {
  scope: { isGlobalView: boolean; companyIds: string[] };
  companyId: string;
}): Promise<ScopedCompanyContext> {
  if (!input.scope.isGlobalView && !input.scope.companyIds.includes(input.companyId)) {
    throw new Error("HOST_COMPANY_OUT_OF_SCOPE");
  }

  const company = await prisma.company.findFirst({
    where: { id: input.companyId, deletedAt: null },
    select: { id: true, nomeFantasia: true, razaoSocial: true },
  });

  if (!company) {
    throw new Error("HOST_COMPANY_NOT_FOUND");
  }

  return {
    ...company,
    displayLabel: buildCompanyDisplayLabel(company),
    normalizedPrimaryNames: [normalizeCompareValue(company.nomeFantasia), normalizeCompareValue(company.razaoSocial)].filter(
      Boolean
    ),
  };
}
