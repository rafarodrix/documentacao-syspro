import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/remote/module-settings");
export const PUT = createStaticProxyHandler("/settings/remote/module-settings");
