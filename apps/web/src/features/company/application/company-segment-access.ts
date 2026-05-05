import type { CompanySegmentValue } from "@dosc-syspro/contracts/company";
import { trpc } from "@/lib/api/trpc-client";

export async function canAccessByCompanySegment(
  _userId: string,
  requiredSegments: CompanySegmentValue[],
): Promise<boolean> {
  if (!requiredSegments.length) return true;

  try {
    return await trpc.companies.checkSegmentAccess.mutate({ requiredSegments });
  } catch {
    return false;
  }
}
