import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const PUT = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/settings/contracts/${id}`,
);
export const DELETE = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/settings/contracts/${id}`,
);
