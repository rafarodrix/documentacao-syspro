import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const GET = createStaticProxyHandler("/settings/platform-notifications");
