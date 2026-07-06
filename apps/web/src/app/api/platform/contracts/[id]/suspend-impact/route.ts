import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/settings/contracts/${id}/suspend-impact`,
);
