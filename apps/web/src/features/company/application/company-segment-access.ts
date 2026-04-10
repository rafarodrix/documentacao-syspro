import { CompanySegment } from "@prisma/client";
import { headers } from "next/headers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export async function canAccessByCompanySegment(
  _userId: string,
  requiredSegments: CompanySegment[],
): Promise<boolean> {
  if (!requiredSegments.length) return true;

  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/companies/access/segments`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      }),
      body: JSON.stringify({ requiredSegments }),
      cache: "no-store",
    });

    if (!response.ok) return false;
    return (await response.json()) === true;
  } catch {
    return false;
  }
}
