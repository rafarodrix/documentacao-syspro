import type { Release } from "@dosc-syspro/core";
import { headers } from "next/headers";
import { resolveServerOrigin } from "@/lib/server-origin";

type ReleasesResponse = {
  success: boolean;
  data?: Release[];
};

async function fetchPublicReleases(): Promise<Release[]> {
  const requestHeaders = await headers();
  const origin = resolveServerOrigin(requestHeaders);
  const cookie = requestHeaders.get("cookie");

  const response = await fetch(`${origin}/api/releases`, {
    headers: {
      ...(cookie ? { cookie } : {}),
    },
    next: {
      revalidate: 3600,
      tags: ["releases"],
    },
  });

  if (!response.ok) return [];

  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    const bodyPreview = (await response.text()).slice(0, 120);
    throw new Error(`Unexpected releases response content-type: ${contentType || "unknown"} body=${bodyPreview}`);
  }

  const payload = (await response.json()) as ReleasesResponse;
  return payload.success ? payload.data ?? [] : [];
}

export async function getReleases(): Promise<Release[]> {
  try {
    return await fetchPublicReleases();
  } catch (error) {
    console.warn("getReleases failed:", error);
    return [];
  }
}
