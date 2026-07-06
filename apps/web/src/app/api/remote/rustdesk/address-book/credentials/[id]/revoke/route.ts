import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const POST = createInternalParamsProxyHandler<{ id: string }>(
  ({ id }) => `/remote/rustdesk/address-book/credentials/${id}/revoke`,
);

