import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/tax/interstate-icms");
export const PUT = createStaticProxyHandler("/settings/tax/interstate-icms");
