import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RemoteHostDetails } from "@/features/remote/domain/model";

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const { host } = details;
  const rustdeskHref = host.rustdeskId ? `rustdesk://${host.rustdeskId}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{host.name}</h1>
          <p className="text-muted-foreground">
            {host.companyName ?? "Sem empresa"}{host.environment ? ` | ${host.environment}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/app/plataforma-remota" className={cn(buttonVariants({ variant: "outline" }))}>
            Voltar
          </Link>
          {rustdeskHref ? (
            <a href={rustdeskHref} className={cn(buttonVariants({ variant: "default" }))}>
              Abrir acesso remoto
            </a>
          ) : (
            <Button disabled>RustDesk nao configurado</Button>
          )}
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Dados do host</CardTitle>
          <CardDescription>Ponto operacional do acesso remoto ja configurado para a empresa.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">ID:</span> {host.id}</p>
            <p><span className="font-medium text-foreground">Empresa:</span> {host.companyName ?? "Sem empresa"}</p>
            <p><span className="font-medium text-foreground">Descricao:</span> {host.description || "Sem descricao operacional."}</p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Provider:</span> {host.provider ?? "Nao definido"}</p>
            <p><span className="font-medium text-foreground">RustDesk ID:</span> {host.rustdeskId ?? "Nao configurado"}</p>
            <p>
              <span className="font-medium text-foreground">Status:</span>{" "}
              <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                {host.status}
              </Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Sessoes recentes</CardTitle>
          <CardDescription>Historico recente do host com vinculo explicito ao ticket quando existir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {details.recentSessions.length ? (
            details.recentSessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{session.hostName}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado por {session.requestedByName ?? session.requestedByUserId}
                    </p>
                    {session.ticketNumber && (
                      <p className="text-xs text-muted-foreground">Ticket #{session.ticketNumber}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {session.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma sessao registrada para este host ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
