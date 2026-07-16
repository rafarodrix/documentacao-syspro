/**
 * Proxy para a sugestão de tributação que agora roda no backend.
 * O frontend apenas repassa o POST JSON para POST /api/tax/suggest.
 */
import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const POST = createStaticProxyHandler("/tax/suggest");