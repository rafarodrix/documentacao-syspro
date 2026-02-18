"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
});

// Exporta os hooks para serem usados nos componentes (useSession, signIn, etc)
export const { useSession, signIn, signOut } = authClient;