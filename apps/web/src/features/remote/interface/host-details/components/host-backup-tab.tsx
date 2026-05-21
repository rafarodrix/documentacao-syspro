"use client";

import { Archive } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";

type FirebirdData = {
  name: string | null;
  version: string | null;
  processRunning: boolean | null;
};

const UPCOMING_FEATURES = [
  {
    title: "Jobs gbak / nbackup",
    description: "Agendamento automático de backup incremental e full via gbak/nbackup com retenção configurável.",
  },
  {
    title: "Catálogo de artefatos",
    description: "Registro de todos os backups gerados com metadados de tamanho, hash e status de validação.",
  },
  {
    title: "Restauração assistida",
    description: "Fluxo guiado para restauração pontual com validação de integridade antes da aplicação.",
  },
  {
    title: "Notificações de falha",
    description: "Alertas imediatos via portal e e-mail em caso de falha ou timeout no processo de backup.",
  },
] as const;

export function HostBackupTab({ firebirdData }: { firebirdData: FirebirdData }) {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Backup
          </CardTitle>
          <CardDescription>
            Gerenciamento de backup dos bancos de dados Firebird e arquivos críticos do Syspro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-sm font-medium text-foreground">Banco de dados detectado</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Firebird</p>
                <p className="mt-1 text-sm text-foreground">{firebirdData.name ?? "Sem leitura"}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versão</p>
                <p className="mt-1 text-sm text-foreground">{firebirdData.version ?? "Sem leitura"}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processo fbserver</p>
                <p className="mt-1 text-sm text-foreground">
                  {firebirdData.processRunning === null
                    ? "Sem leitura"
                    : firebirdData.processRunning
                      ? "Em execução"
                      : "Parado"}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {UPCOMING_FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-dashed border-border/40 bg-muted/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{feature.title}</p>
                  <Badge
                    variant="outline"
                    className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
                  >
                    Em desenvolvimento
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
