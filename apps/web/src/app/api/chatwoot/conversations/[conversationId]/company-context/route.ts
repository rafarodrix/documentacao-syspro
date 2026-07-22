import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const PUT = createParamsProxyHandler<{ conversationId: string }>(
  ({ conversationId }) => `/chatwoot/conversations/${encodeURIComponent(conversationId)}/company-context`,
);
