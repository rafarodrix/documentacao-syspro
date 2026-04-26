import type { Release } from "@dosc-syspro/core";
import { callWebApi } from "@/lib/web-api";

type ReleasesResponse = {
    success: boolean;
    data?: Release[];
};

export async function getReleases(): Promise<Release[]> {
  try {
    const response = await callWebApi("/api/releases").then((res) => res.json() as Promise<ReleasesResponse>);
    return response.success ? response.data ?? [] : [];
  } catch (error) {
    console.warn("getReleases failed:", error);
    return [];
  }
}



