// apps/web/src/features/user-access/infrastructure/membership-helpers.ts

import { prisma } from "@/lib/prisma";

/**
 * Retorna todos os companyIds vinculados a um usuário via Membership.
 * Fonte única — usado em actions.ts e queries.ts.
 */
export async function getUserCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}