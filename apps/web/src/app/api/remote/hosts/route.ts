import { createInternalStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const POST = createInternalStaticProxyHandler("/remote/hosts");
