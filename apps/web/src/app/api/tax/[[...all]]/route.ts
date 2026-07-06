import { createCatchAllProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createCatchAllProxyHandler("/tax");
