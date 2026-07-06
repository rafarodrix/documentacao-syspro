import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const PATCH = createInternalParamsProxyHandler<{ id: string; updateId: string }>(
  ({ id, updateId }) => `/remote/hosts/${id}/syspro-updates/${updateId}`,
);
