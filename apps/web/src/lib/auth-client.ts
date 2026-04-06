"use client";

import { createAuthClient } from "better-auth/react";

function stripTrailingApiPath(url: string): string {
    const normalized = url.replace(/\/+$/, "");
    return normalized.endsWith("/api")
        ? normalized.slice(0, -4)
        : normalized;
}

function resolveAuthClientBaseUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (apiUrl) return stripTrailingApiPath(apiUrl);

    const explicitBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim();
    if (explicitBaseUrl) {
        return explicitBaseUrl.replace(/\/+$/, "");
    }

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    return "http://localhost:3000";
}

export const authClient = createAuthClient({
    baseURL: resolveAuthClientBaseUrl()
});

// Exporta os hooks para serem usados nos componentes (useSession, signIn, etc)
export const { useSession, signIn, signOut } = authClient;
