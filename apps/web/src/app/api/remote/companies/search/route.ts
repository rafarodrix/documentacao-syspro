import { createInternalStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const GET = createInternalStaticProxyHandler("/remote/companies/search");
