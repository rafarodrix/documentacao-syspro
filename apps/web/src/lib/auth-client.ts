"use client";

import { createAuthClient } from "better-auth/react";

function resolveAuthClientBaseUrl(): string {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    const explicitBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim();
    if (explicitBaseUrl) {
        return explicitBaseUrl.replace(/\/$/, "");
    }

    return "http://localhost:3000";
}

export const authClient = createAuthClient({
    baseURL: resolveAuthClientBaseUrl()
});

// Exporta os hooks para serem usados nos componentes (useSession, signIn, etc)
export const { useSession, signIn, signOut } = authClient;
