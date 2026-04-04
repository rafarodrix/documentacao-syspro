import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { getRemotePlatformDirectory } from "@/features/remote/application/queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { Monitor } from "lucide-react";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];

export default async function RemotePlatformPage() {
  await requireRole(ALLOWED_ROLES, "/portal");
  const tenantScope = await getRemoteTenantScope();
  const directory = await getRemotePlatformDirectory(tenantScope);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <RemotePlatformDirectoryPanel directory={directory} />
    </div>
  );
}
