"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import { AlertTriangle, Ban, CheckCircle2, Clock3, Inbox, Search, UserRound } from "lucide-react";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { getAtendimentosData } from "../../application";
import { DashboardMetricCard } from "../components/dashboard-metric-card";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutes(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 60) return `${value.toLocaleString("pt-BR")} min`;
  return `${(value / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

type AtendimentosData = Awaited<ReturnType<typeof getAtendimentosData>>;

export function SupportAtendimentosSubtab() {
  const [from, setFrom] = useState(() => toDateInputValue(new Date()));
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [assigneeId, setAssigneeId] = useState("");
  const [contact, setContact] = useState("");
  const [data, setData] = useState<AtendimentosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getAtendimentosData({ from, to, assigneeId, contact })
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar atendimentos.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [from, to, assigneeId, contact]);

  const statusBase = useMemo(() => Math.max(data?.totalCount ?? 0, 1), [data?.totalCount]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de atendimento</CardTitle>
          <CardDescription>Padrao em hoje, com recorte por periodo, atendente e contato.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="atendimentos-from">De</Label>
            <Input id="atendimentos-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="atendimentos-to">Ate</Label>
            <Input id="atendimentos-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Atendente</Label>
            <Select value={assigneeId || "__all__"} onValueChange={(value) => setAssigneeId(value === "__all__" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {(data?.assigneeOptions ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="atendimentos-contact">Contato</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="atendimentos-contact"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Nome, telefone ou identificador"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      ) : null}
      {data?.warning ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{data.warning}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard title="Total" value={data?.totalCount ?? 0} helper="Atendimentos no periodo" icon={Inbox} tone="blue" />
        <DashboardMetricCard title="Abertos" value={data?.openCount ?? 0} helper="Ainda em andamento" icon={UserRound} tone="amber" />
        <DashboardMetricCard title="Resolvidos" value={data?.resolvedCount ?? 0} helper="Encerrados no recorte" icon={CheckCircle2} tone="emerald" />
        <DashboardMetricCard title="Cancelados" value={data?.cancelledCount ?? 0} helper="Baseado nas tags de cancelamento" icon={Ban} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ActivityChart
          title="Volume de atendimentos"
          description={loading ? "Carregando periodo selecionado" : "Conversas criadas no periodo filtrado"}
          points={data?.activity ?? []}
          badgeLabel="Chatwoot"
          emptyLabel="Sem conversas no recorte"
        />

        <div className="grid grid-cols-1 gap-4">
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Indicadores operacionais</CardTitle>
              <CardDescription>Leitura rapida da fila filtrada.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-sm">Primeira resposta</span>
                </div>
                <div className="text-2xl font-semibold tracking-tight">{formatMinutes(data?.avgFirstResponseMinutes ?? null)}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Ban className="h-4 w-4" />
                  <span className="text-sm">Subtipos de fechamento</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2"><span>Cliente</span><span className="font-medium">{data?.cancelledByCustomerCount ?? 0}</span></div>
                  <div className="flex justify-between gap-2"><span>Agente</span><span className="font-medium">{data?.cancelledByAgentCount ?? 0}</span></div>
                  <div className="flex justify-between gap-2"><span>Spam</span><span className="font-medium">{data?.spamCount ?? 0}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status e carga</CardTitle>
              <CardDescription>Distribuicao e responsaveis mais carregados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(data?.statusCounts ?? []).map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.status}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.min(100, (item.count / statusBase) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {(data?.assigneeLoads ?? []).slice(0, 4).map((item) => (
                  <div key={`${item.userId ?? "none"}-${item.name}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.waitingCount} aguardando</p>
                    </div>
                    <Badge variant="outline" className="tabular-nums">{item.openCount} abertas</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
