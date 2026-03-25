import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { getRemotePlatformDirectory } from "@/features/remote/application/queries";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Monitor, Settings } from "lucide-react";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];

export default async function RemotePlatformPage() {
  await requireRole(ALLOWED_ROLES, "/portal");
  const directory = await getRemotePlatformDirectory();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Monitor className="h-8 w-8 text-primary/80" />
            Plataforma Remota
          </h1>
          <p className="max-w-3xl text-muted-foreground text-lg">
            Centro operacional do modulo remoto: descubra maquinas, cadastre e edite hosts, vincule empresas e execute o atendimento.
          </p>
        </div>

        <a
          href="/api/remote/agents/discovery-script"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2 self-start")}
        >
          <Download className="h-4 w-4" />
          Baixar script padrao
        </a>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href="/downloads/trilink-instalador-padrao.ps1"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <Download className="h-4 w-4" />
          Baixar script manual
        </a>
        <a
          href="/portal/configuracoes?tab=remote"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <Settings className="h-4 w-4" />
          Abrir configuracoes do modulo
        </a>
      </div>

      <RemotePlatformDirectoryPanel directory={directory} />
    </div>
  );
}
