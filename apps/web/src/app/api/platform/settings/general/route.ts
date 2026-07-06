import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/general");
export const PUT = createStaticProxyHandler("/settings/general");
