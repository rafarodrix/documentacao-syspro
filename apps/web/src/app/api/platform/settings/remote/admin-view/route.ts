import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/remote/admin-view");
