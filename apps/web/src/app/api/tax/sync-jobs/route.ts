import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/tax/sync-jobs");
export const DELETE = createStaticProxyHandler("/tax/sync-jobs");
