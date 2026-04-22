import type { Release } from "@dosc-syspro/core";
import { callBackendApi } from "@/lib/backend-api-client";

type ReleasesResponse = {
    success: boolean;
    data?: Release[];
};

export async function getReleases(): Promise<Release[]> {
  try {
    const response = await callBackendApi<ReleasesResponse>("releases", "");
    return response.success ? response.data ?? [] : [];
  } catch (error) {
    console.warn("getReleases failed:", error);
    return [];
  }
}



