"use client";

import { createAuthClient } from "better-auth/react";

function resolveAuthClientBaseUrl(): string {
    const explicitBaseUrl = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.trim();
    if (explicitBaseUrl) return explicitBaseUrl.replace(/\/+$/, "");
    return "/api/auth";
}

export const authClient = createAuthClient({
    baseURL: resolveAuthClientBaseUrl()
});

// Exporta os hooks para serem usados nos componentes (useSession, signIn, etc)
export const { useSession, signIn, signOut } = authClient;
