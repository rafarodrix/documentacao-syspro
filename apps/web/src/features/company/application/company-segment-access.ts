import type { CompanySegmentValue } from "@dosc-syspro/contracts/company";
import { callWebApi } from "@/lib/web-api";

export async function canAccessByCompanySegment(
  _userId: string,
  requiredSegments: CompanySegmentValue[],
): Promise<boolean> {
  if (!requiredSegments.length) return true;

  try {
    const response = await callWebApi("/api/companies/access/segments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ requiredSegments }),
    });

    if (!response.ok) return false;
    return (await response.json()) === true;
  } catch {
    return false;
  }
}
