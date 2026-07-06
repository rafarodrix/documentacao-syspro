import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/crm/leads/${id}`,
);
export const PATCH = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/crm/leads/${id}`,
);
