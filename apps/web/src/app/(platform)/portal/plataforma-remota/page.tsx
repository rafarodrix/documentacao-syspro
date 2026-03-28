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
      <div className="rounded-2xl border border-border/55 bg-background/55 px-5 py-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
            <Monitor className="h-5 w-5 text-primary/85" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Plataforma Remota</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lista de acessos otimizada para entrada rapida. Use `Acesso` para conectar e `Detalhes` para diagnostico completo com Saude do Agente, Auto-cura e telemetria.
            </p>
          </div>
        </div>
      </div>

      <RemotePlatformDirectoryPanel directory={directory} />
    </div>
  );
}
