import type { Release } from "@dosc-syspro/core";

type ReleasesResponse = {
    success: boolean;
    data?: Release[];
};

function resolvePublicWebOrigin() {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_URL?.trim();

  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchPublicReleases(): Promise<Release[]> {
  const origin = resolvePublicWebOrigin();
  const response = await fetch(`${origin}/api/releases`, {
    next: {
      revalidate: 3600,
      tags: ["releases"],
    },
  });

  if (!response.ok) return [];

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



