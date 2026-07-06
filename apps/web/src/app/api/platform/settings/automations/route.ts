import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/automations");
export const PUT = createStaticProxyHandler("/settings/automations");
