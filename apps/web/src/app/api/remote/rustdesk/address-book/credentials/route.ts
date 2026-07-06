import { createInternalStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const GET = createInternalStaticProxyHandler("/remote/rustdesk/address-book/credentials");
export const POST = createInternalStaticProxyHandler("/remote/rustdesk/address-book/credentials");

