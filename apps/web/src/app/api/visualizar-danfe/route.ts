/**
 * Proxy para o parser de NF-e XML que agora roda no backend.
 * O frontend apenas repassa o upload multipart para POST /api/tax/nfe/parse.
 */
import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const POST = createStaticProxyHandler("/tax/nfe/parse");
