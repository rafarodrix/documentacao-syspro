import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/crm/leads");
export const POST = createStaticProxyHandler("/crm/leads");
