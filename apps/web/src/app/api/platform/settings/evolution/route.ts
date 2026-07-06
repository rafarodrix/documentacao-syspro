import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/evolution");
export const PUT = createStaticProxyHandler("/settings/evolution");
