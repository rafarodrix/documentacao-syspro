import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/chatwoot/config");
export const PUT = createStaticProxyHandler("/settings/chatwoot/config");
