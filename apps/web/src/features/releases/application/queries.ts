import type { Release } from "@dosc-syspro/core";
import { callWebApi } from "@/lib/web-api";

type ReleasesResponse = {
    success: boolean;
    data?: Release[];
};

function isExpectedDynamicUsageError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const withDigest = error as { digest?: string; description?: string };
  return (
    withDigest.digest === "DYNAMIC_SERVER_USAGE" ||
    withDigest.description?.includes("couldn't be rendered statically because it used `headers`") === true
  );
}

export async function getReleases(): Promise<Release[]> {
  try {
    const response = await callWebApi("/api/releases").then((res) => res.json() as Promise<ReleasesResponse>);
    return response.success ? response.data ?? [] : [];
  } catch (error) {
    if (isExpectedDynamicUsageError(error)) {
      return [];
    }
    console.warn("getReleases failed:", error);
    return [];
  }
}



