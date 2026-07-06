import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/storage/config");
export const PUT = createStaticProxyHandler("/settings/storage/config");
