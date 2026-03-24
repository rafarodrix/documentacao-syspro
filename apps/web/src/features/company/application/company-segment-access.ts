import { CompanySegment, CompanyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function canAccessByCompanySegment(
  userId: string,
  requiredSegments: CompanySegment[],
): Promise<boolean> {
  if (!requiredSegments.length) return true;

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      company: {
        deletedAt: null,
        status: CompanyStatus.ACTIVE,
      },
    },
    select: {
      company: {
        select: { segment: true },
      },
    },
  });

  const membershipSegments = memberships.map((membership) => membership.company.segment);

  if (!membershipSegments.length || membershipSegments.some((segment) => segment == null)) {
    return true;
  }

  const definedSegments = membershipSegments.filter(
    (segment): segment is CompanySegment => segment != null,
  );

  return definedSegments.some((segment) => requiredSegments.includes(segment));
}
