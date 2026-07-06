import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const PUT = createStaticProxyHandler("/settings/permissions/matrix-visibility");
