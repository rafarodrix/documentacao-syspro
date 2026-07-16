import { createCatchAllProxyHandler } from "@/app/api/_shared/backend-proxy";

// tRPC do browser precisa passar pela borda do frontend em self-hosting.
// Usar rota explicita evita depender de rewrites avaliados apenas em build-time.
const proxyHandler = createCatchAllProxyHandler("/trpc");

export const GET = proxyHandler;
export const POST = proxyHandler;
