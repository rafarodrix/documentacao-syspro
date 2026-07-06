import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const POST = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote/hosts/${id}/agent-token`,
);
export const DELETE = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote/hosts/${id}/agent-token`,
);
