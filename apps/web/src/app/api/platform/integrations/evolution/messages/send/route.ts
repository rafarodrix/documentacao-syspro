import { createInternalStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const POST = createInternalStaticProxyHandler("/integrations/evolution/messages/send");
