import Link from "next/link";
import { ArrowUpRight, MonitorCog } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteModuleSettingsForm } from "@/components/platform/app/settings/RemoteModuleSettingsForm";

type RemoteAccessSettingsTabProps = {
  companyOptions: Array<{ id: string; label: string }>;
};

export function RemoteAccessSettingsTab({ companyOptions }: RemoteAccessSettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Escopo da aba</CardTitle>
          <CardDescription>
            Esta area concentra somente governanca global do modulo remoto: perfil RustDesk, politicas do agente e credenciais de integracao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <MonitorCog className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Operacao diaria</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastro/edicao de host, vinculacao de instalacoes, sessoes e diagnostico operacional ficam em Plataforma Remota.
            </p>
            <div className="mt-3">
              <Button asChild size="sm" className="gap-2">
                <Link href="/portal/plataforma-remota">
                  Abrir Plataforma Remota
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <RemoteModuleSettingsForm companyOptions={companyOptions} />
    </div>
  );
}

