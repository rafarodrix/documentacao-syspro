import { createAgentIngressProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const POST = createAgentIngressProxyHandler("/remote/rustdesk/ack");
