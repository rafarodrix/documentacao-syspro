import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const DELETE = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/documentos/${id}`,
);
