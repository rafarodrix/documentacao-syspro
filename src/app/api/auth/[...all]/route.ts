import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Cria o handler do Better Auth
const handlers = toNextJsHandler(auth);

// Exporta explicitamente os métodos
export const GET = handlers.GET;
export const POST = handlers.POST;