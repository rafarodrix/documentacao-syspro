import { createInternalParamsProxyHandler } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export const PATCH = createInternalParamsProxyHandler<{
  id: string;
  installationId: string;
}>(({ id, installationId }) => `/remote/hosts/${id}/installations/${installationId}/runtime`);
