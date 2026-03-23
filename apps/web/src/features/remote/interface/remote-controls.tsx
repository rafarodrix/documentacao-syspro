"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RemotePlatformOverview } from "@/features/remote/domain/model";

type Props = {
  overview: RemotePlatformOverview;
};

async function parseJson(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "Falha na operacao.");
  }
  return payload;
}

export function RemotePlatformControls({ overview }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCompanyId, setSelectedCompanyId] = useState(overview.companyOptions[0]?.id ?? "");
  const [hostName, setHostName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [provider, setProvider] = useState("RustDesk");
  const [selectedHostId, setSelectedHostId] = useState("");
  const [sessionCompanyId, setSessionCompanyId] = useState(overview.companyOptions[0]?.id ?? "");
  const [sessionTicketId, setSessionTicketId] = useState("");
  const [sessionTicketNumber, setSessionTicketNumber] = useState("");
  const [sessionReason, setSessionReason] = useState("");

  const canCreateHosts = overview.tenantScope.role !== "CLIENTE_ADMIN";
  const hostOptions = useMemo(() => {
    if (!sessionCompanyId) return overview.hostOptions;
    return overview.hostOptions.filter((host) => host.companyId === sessionCompanyId);
  }, [overview.hostOptions, sessionCompanyId]);

  const refresh = () => startTransition(() => router.refresh());

  async function handleCreateHost() {
    if (!selectedCompanyId || !hostName.trim()) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    try {
      await parseJson(
        await fetch("/api/remote/hosts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            name: hostName,
            environment,
            provider,
          }),
        })
      );

      toast.success("Host remoto criado.");
      setHostName("");
      setEnvironment("");
      setProvider("RustDesk");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar host.");
    }
  }

  async function handleCreateSession() {
    if (!sessionCompanyId || !selectedHostId) {
      toast.error("Selecione empresa e host.");
      return;
    }

    try {
      await parseJson(
        await fetch("/api/remote/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: sessionCompanyId,
            hostId: selectedHostId,
            ticketId: sessionTicketId,
            ticketNumber: sessionTicketNumber,
            reason: sessionReason,
          }),
        })
      );

      toast.success("Sessao remota solicitada.");
      setSessionTicketId("");
      setSessionTicketNumber("");
      setSessionReason("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao solicitar sessao.");
    }
  }

  async function handleSessionTransition(sessionId: string, action: "start" | "stop") {
    try {
      await parseJson(
        await fetch(`/api/remote/sessions/${sessionId}/${action}`, {
          method: "POST",
        })
      );

      toast.success(action === "start" ? "Sessao iniciada." : "Sessao encerrada.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar sessao.");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Cadastro de host</CardTitle>
          <CardDescription>
            Cadastro minimo para o MVP remoto. Perfis tecnicos podem registrar novos hosts por empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canCreateHosts ? (
            <>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {overview.companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do host</Label>
                <Input value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="ERP-MATRIZ-01" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Input value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="Producao" />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="RustDesk" />
                </div>
              </div>

              <Button onClick={handleCreateHost} disabled={isPending}>
                Criar host
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              `CLIENTE_ADMIN` nao cadastra hosts. O escopo deste perfil e consumir apenas os hosts ja vinculados a propria empresa.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Operacao de sessao remota</CardTitle>
          <CardDescription>
            Fluxo inicial de `FEAT-003`: solicitar sessao, iniciar e encerrar com persistencia de status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={sessionCompanyId}
                onValueChange={(value) => {
                  setSessionCompanyId(value);
                  setSelectedHostId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {overview.companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Host</Label>
              <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o host" />
                </SelectTrigger>
                <SelectContent>
                  {hostOptions.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      {host.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input
              value={sessionReason}
              onChange={(event) => setSessionReason(event.target.value)}
              placeholder="Suporte remoto para validacao do ambiente"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ticket ID</Label>
              <Input
                value={sessionTicketId}
                onChange={(event) => setSessionTicketId(event.target.value)}
                placeholder="12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Numero do ticket</Label>
              <Input
                value={sessionTicketNumber}
                onChange={(event) => setSessionTicketNumber(event.target.value)}
                placeholder="2026001234"
              />
            </div>
          </div>

          <Button onClick={handleCreateSession} disabled={isPending}>
            Solicitar sessao
          </Button>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Ultimas sessoes</h3>
              <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                {overview.recentSessions.length} registro(s)
              </Badge>
            </div>

            {overview.recentSessions.length ? (
              overview.recentSessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.hostName}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.companyName ?? "Sem empresa"} | {session.status}
                      </p>
                      {session.ticketNumber && (
                        <p className="text-xs text-muted-foreground">Ticket #{session.ticketNumber}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                      {session.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {session.status === "REQUESTED" && (
                      <Button size="sm" onClick={() => handleSessionTransition(session.id, "start")} disabled={isPending}>
                        Iniciar
                      </Button>
                    )}
                    {session.status === "STARTED" && (
                      <Button size="sm" variant="secondary" onClick={() => handleSessionTransition(session.id, "stop")} disabled={isPending}>
                        Encerrar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sessao disponivel para operacao ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
