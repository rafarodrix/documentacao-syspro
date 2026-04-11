import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { remoteErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

export async function requireRemotePermission(
  permission: Parameters<typeof currentUserHasPermission>[0],
  message: string,
  options?: Parameters<typeof currentUserHasPermission>[1],
) {
  const session = await getProtectedSession();
  if (!session) {
    return {
      ok: false as const,
      response: remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 }),
    };
  }

  const allowed = await currentUserHasPermission(permission, options);
  if (!allowed) {
    return {
      ok: false as const,
      response: remoteErrorResponse({ code: "FORBIDDEN", message, httpStatus: 403 }),
    };
  }

  return { ok: true as const, session };
}
