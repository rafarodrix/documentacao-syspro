import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { getRemotePlatformOverview } from "@/features/remote/application/queries";
import { RemotePlatformOverviewPanel } from "@/features/remote/interface";
import { Monitor } from "lucide-react";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];

export default async function RemotePlatformPage() {
  await requireRole(ALLOWED_ROLES, "/app");
  const overview = await getRemotePlatformOverview();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <Monitor className="h-8 w-8 text-primary/80" />
          Plataforma Remota
        </h1>
        <p className="max-w-3xl text-muted-foreground text-lg">
          Estrutura inicial para acesso remoto, cofres de credenciais, backup e auditoria operacional.
        </p>
      </div>

      <RemotePlatformOverviewPanel overview={overview} />
    </div>
  );
}
