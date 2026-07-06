import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/google-calendar/config");
export const PUT = createStaticProxyHandler("/settings/google-calendar/config");
