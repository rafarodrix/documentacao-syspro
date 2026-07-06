import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/sefaz-routes");
export const PUT = createStaticProxyHandler("/settings/sefaz-routes");
