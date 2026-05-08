"use client";

import { useEffect, useMemo, useState } from "react";
import { adminAtendimentosDataSchema } from "@dosc-syspro/contracts/dashboard";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import { AlertTriangle, Ban, CheckCircle2, Clock3, Inbox, MessageSquareText, Search, UserRound, UsersRound } from "lucide-react";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { DashboardMetricCard } from "../components/dashboard-metric-card";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRangePreset(preset: "today" | "7d" | "30d") {
  const end = new Date();
  const start = new Date(end);

  if (preset === "7d") start.setDate(end.getDate() - 6);
  if (preset === "30d") start.setDate(end.getDate() - 29);

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function formatMinutes(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 60) return `${value.toLocaleString("pt-BR")} min`;
  return `${(value / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

function formatHours(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 24) return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return `${(value / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

function formatPercent(value: number, base: number) {
  if (base <= 0) return "0%";
  return `${Math.round((value / base) * 100)}%`;
}

function formatScore(value: number | null) {
  if (value === null) return "Sem base";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}

type AtendimentosData = Awaited<ReturnType<typeof getAtendimentosData>>;

async function getAtendimentosData(params?: {
  from?: string;
  to?: string;
  assigneeId?: string;
  contact?: string;
}) {
  const query = new URLSearchParams();
  if (params?.from?.trim()) query.set("from", params.from.trim());
  if (params?.to?.trim()) query.set("to", params.to.trim());
  if (params?.assigneeId?.trim()) query.set("assigneeId", params.assigneeId.trim());
  if (params?.contact?.trim()) query.set("contact", params.contact.trim());

  const suffix = query.size ? `?${query.toString()}` : "";
  const res = await fetch(`/api/dashboard/suporte/atendimentos${suffix}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Falha HTTP ${res.status}`;
    throw new Error(error);
  }

  return adminAtendimentosDataSchema.parse(payload?.data);
}

export function SupportAtendimentosSubtab() {
  const todayRange = useMemo(() => buildRangePreset("today"), []);
  const [from, setFrom] = useState(todayRange.from);
  const [to, setTo] = useState(todayRange.to);
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
  const channelBase = useMemo(() => Math.max(data?.totalCount ?? 0, 1), [data?.totalCount]);
  const csatBase = useMemo(() => Math.max(data?.csatResponseCount ?? 0, 1), [data?.csatResponseCount]);

  const applyPreset = (preset: "today" | "7d" | "30d") => {
    const next = buildRangePreset(preset);
    setFrom(next.from);
    setTo(next.to);
  };

  const isPresetActive = (preset: "today" | "7d" | "30d") => {
    const range = buildRangePreset(preset);
    return from === range.from && to === range.to;
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de atendimento</CardTitle>
          <CardDescription>Padrao em hoje, com recorte por periodo, atendente e contato.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={isPresetActive("today") ? "default" : "outline"} size="sm" onClick={() => applyPreset("today")}>
              Hoje
            </Button>
            <Button variant={isPresetActive("7d") ? "default" : "outline"} size="sm" onClick={() => applyPreset("7d")}>
              Ultimos 7 dias
            </Button>
            <Button variant={isPresetActive("30d") ? "default" : "outline"} size="sm" onClick={() => applyPreset("30d")}>
              Ultimos 30 dias
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <DashboardMetricCard title="Total" value={data?.totalCount ?? 0} helper="Atendimentos no periodo" icon={Inbox} tone="blue" />
        <DashboardMetricCard title="Abertos" value={data?.openCount ?? 0} helper="Ainda em andamento" icon={UserRound} tone="amber" />
        <DashboardMetricCard title="Sem responsavel" value={data?.unassignedCount ?? 0} helper="Fila sem ownership" icon={UsersRound} tone="red" />
        <DashboardMetricCard title="Resolvidos" value={data?.resolvedCount ?? 0} helper="Encerrados no recorte" icon={CheckCircle2} tone="emerald" />
        <DashboardMetricCard title="Cancelados" value={data?.cancelledCount ?? 0} helper="Cliente ou agente" icon={Ban} tone="red" />
        <DashboardMetricCard title="CSAT ignorado" value={data?.csatSkippedCount ?? 0} helper="Regra por cancelamento ou spam" icon={MessageSquareText} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
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
                  <Clock3 className="h-4 w-4" />
                  <span className="text-sm">Resolucao media</span>
                </div>
                <div className="text-2xl font-semibold tracking-tight">{formatHours(data?.avgResolutionHours ?? null)}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">CSAT elegivel</span>
                </div>
                <div className="text-2xl font-semibold tracking-tight">{data?.csatEligibleResolvedCount ?? 0}</div>
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
              <CardTitle className="text-base">Status e canais</CardTitle>
              <CardDescription>Distribuicao da fila e origem dos atendimentos.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
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
                {(data?.channelCounts ?? []).map((item) => (
                  <div key={item.channel} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.channel}</p>
                      <p className="text-xs text-muted-foreground">{formatPercent(item.count, channelBase)} do total</p>
                    </div>
                    <Badge variant="outline" className="tabular-nums">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CSAT</CardTitle>
            <CardDescription>Satisfacao real capturada no periodo filtrado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="mb-2 text-sm text-muted-foreground">Nota media</div>
              <div className="text-2xl font-semibold tracking-tight">{formatScore(data?.csatAverageScore ?? null)}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="mb-2 text-sm text-muted-foreground">Respondido</div>
              <div className="text-2xl font-semibold tracking-tight">{data?.csatResponseCount ?? 0}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPercent(data?.csatResponseCount ?? 0, data?.csatEligibleResolvedCount ?? 0)} dos elegiveis
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="mb-2 text-sm text-muted-foreground">Notas baixas</div>
              <div className="text-2xl font-semibold tracking-tight">{data?.csatLowScoreCount ?? 0}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPercent(data?.csatLowScoreCount ?? 0, data?.csatResponseCount ?? 0)} das respostas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuicao de notas</CardTitle>
            <CardDescription>Volume de respostas por faixa de satisfacao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.csatScoreDistribution ?? []).map((item) => (
              <div key={item.score} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Nota {item.score}</span>
                  <span className="font-medium tabular-nums">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.min(100, (item.count / csatBase) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Carga por atendente</CardTitle>
            <CardDescription>Fila aberta e itens aguardando por responsavel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.assigneeLoads ?? []).length ? (
              (data?.assigneeLoads ?? []).map((item) => (
                <div key={`${item.userId ?? "none"}-${item.name}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.waitingCount} aguardando</p>
                  </div>
                  <Badge variant="outline" className="tabular-nums">{item.openCount} abertas</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem atendentes identificados no recorte.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contatos mais recorrentes</CardTitle>
            <CardDescription>Quem mais acionou a operacao no periodo filtrado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.topContacts ?? []).length ? (
              (data?.topContacts ?? []).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.channel}</p>
                  </div>
                  <Badge variant="outline" className="tabular-nums">{item.count} atend.</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem contatos identificados no recorte.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">CSAT por atendente</CardTitle>
          <CardDescription>Quem recebeu mais respostas e onde estao as notas baixas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.csatAgentPerformance ?? []).length ? (
            (data?.csatAgentPerformance ?? []).map((item) => (
              <div key={`${item.agentId ?? "none"}-${item.agentName}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.agentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.responseCount} respostas • {item.lowScoreCount} notas baixas
                  </p>
                </div>
                <Badge variant="outline" className="tabular-nums">{formatScore(item.averageScore)}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem respostas de CSAT no recorte.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
