import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);

export type TicketViewer = {
  userId: string;
  email: string;
  role: Role;
};

export function isSystemRole(role: Role): boolean {
  return SYSTEM_ROLES.has(role);
}

export async function getScopedCompanyZammadEmails(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });

  const companyIds = memberships.map((membership) => membership.companyId);
  if (!companyIds.length) return [];

  const configured = await prisma.companyZammadEmail.findMany({
    where: {
      companyId: { in: companyIds },
      isActive: true,
    },
    select: { email: true },
  });

  return Array.from(
    new Set(configured.map((item) => item.email.trim().toLowerCase()).filter(Boolean))
  );
}