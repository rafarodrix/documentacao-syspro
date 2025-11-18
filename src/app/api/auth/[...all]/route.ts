// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth"; // Importa a configuração que acabamos de criar
import { toNextJsHandler } from "better-auth/next-js";

// O Better Auth faz toda a mágica do GET/POST aqui
export const { GET, POST } = toNextJsHandler(auth);