import { createParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const PATCH = createParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote-admin/companies/${id}/observacoes`,
);
