import "server-only";

import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export async function getCurrentSessionRoleView() {
  const session = await getProtectedSession();
  if (!session) {
    return null;
  }

  const [canManageTools, canEditSettings, canManageTax] = await Promise.all([
    currentUserHasPermission("tools:all"),
    currentUserHasPermission("settings:edit"),
    currentUserHasPermission("tax_reform:manage"),
  ]);

  return {
    role: session.role,
    userId: session.userId,
    permissions: {
      canManageTools,
      canEditSettings,
      canManageTax,
    },
  };
}
