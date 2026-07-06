import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const PATCH = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/settings/contracts/${id}/status`,
);
