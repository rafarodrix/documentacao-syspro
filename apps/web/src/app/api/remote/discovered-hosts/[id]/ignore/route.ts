import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const POST = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote/discovered-hosts/${id}/ignore`,
);
