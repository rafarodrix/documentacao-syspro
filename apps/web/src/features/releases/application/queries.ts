import type { Release } from "@dosc-syspro/core";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

type ReleasesResponse = {
  success: boolean;
  data?: Release[];
};

async function fetchPublicReleases(): Promise<Release[]> {
  const response = await fetch(`${getBackendApiBaseUrl()}/releases`, {
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
