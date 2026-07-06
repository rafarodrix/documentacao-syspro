import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/chatwoot/behavior");
export const PUT = createStaticProxyHandler("/settings/chatwoot/behavior");
