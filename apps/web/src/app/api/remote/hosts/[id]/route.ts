import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const PATCH = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote/hosts/${id}`,
);
export const DELETE = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote/hosts/${id}`,
);
