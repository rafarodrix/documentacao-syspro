import { createCatchAllProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createCatchAllProxyHandler("/agents");
export const PATCH = createCatchAllProxyHandler("/agents");
export const DELETE = createCatchAllProxyHandler("/agents");
