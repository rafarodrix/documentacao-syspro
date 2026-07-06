import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/tickets");
export const PUT = createStaticProxyHandler("/settings/tickets");
