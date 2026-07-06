import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const POST = createStaticProxyHandler("/settings/contracts");
