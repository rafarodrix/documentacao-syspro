import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { getRemotePlatformDirectory } from "@/features/remote/application/queries";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { Monitor } from "lucide-react";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];

export default async function RemotePlatformPage() {
  await requireRole(ALLOWED_ROLES, "/portal");
  const directory = await getRemotePlatformDirectory();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-border/40 pb-5">
        <Monitor className="h-8 w-8 text-primary/80" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Plataforma Remota</h1>
      </div>

      <RemotePlatformDirectoryPanel directory={directory} />
    </div>
  );
}
