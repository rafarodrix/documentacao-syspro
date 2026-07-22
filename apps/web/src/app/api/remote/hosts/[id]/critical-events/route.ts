import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote-admin/hosts/${id}/critical-events`,
);
