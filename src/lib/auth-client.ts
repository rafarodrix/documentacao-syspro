"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // É OBRIGATÓRIO definir a URL base para evitar erros de CORS e 404 em produção
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
});