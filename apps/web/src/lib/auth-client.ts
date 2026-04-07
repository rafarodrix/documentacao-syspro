"use client";

import { createAuthClient } from "better-auth/react";

function resolveAppOrigin(): string {
    const explicitOrigin =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_WEB_URL?.trim();

    if (explicitOrigin) {
        return explicitOrigin.replace(/\/+$/, "");
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}

function resolveAuthClientBaseUrl(): string {
    const explicitBaseUrl = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.trim();
    if (explicitBaseUrl) {
        if (explicitBaseUrl.startsWith("http://") || explicitBaseUrl.startsWith("https://")) {
            return explicitBaseUrl.replace(/\/+$/, "");
        }

        if (explicitBaseUrl.startsWith("/")) {
            return `${resolveAppOrigin()}${explicitBaseUrl}`.replace(/\/+$/, "");
        }
    }

    return `${resolveAppOrigin()}/api/auth`;
}

export const authClient = createAuthClient({
    baseURL: resolveAuthClientBaseUrl()
});

// Exporta os hooks para serem usados nos componentes (useSession, signIn, etc)
export const { useSession, signIn, signOut } = authClient;
