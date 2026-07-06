import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const DELETE = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/settings/permissions/assignments/${id}`,
);
