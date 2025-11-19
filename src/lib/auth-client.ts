"use client";
import { createAuthClient } from "better-auth/client";

// Cria a instância do cliente para interagir com a API /api/auth
export const authClient = createAuthClient();