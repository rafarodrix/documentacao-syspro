import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemotePlatformDirectory } from "@/features/remote/application/queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export default async function RemotePlatformPage() {
  await requireSession();
  const canAccess =
    (await currentUserHasPermission("tools:all")) ||
    ((await currentUserHasPermission("tools:basic")) &&
      (await currentUserHasPermission("companies:view", { acceptCompanyScope: true })));
  if (!canAccess) {
    redirect("/portal");
  }
  const tenantScope = await getRemoteTenantScope();
  const directory = await getRemotePlatformDirectory(tenantScope);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <RemotePlatformDirectoryPanel directory={directory} />
    </div>
  );
}
