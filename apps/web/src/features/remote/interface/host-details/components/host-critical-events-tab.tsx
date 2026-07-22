"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Filter, ShieldAlert } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime } from "../host-details.helpers";
import { requestRemoteQuery } from "@/features/remote/interface/remote-api";

type EventItem = RemoteHostDetails["criticalEvents"][number];
type Props = { hostId: string; initialEvents: EventItem[] };

function severityVariant(severity: string): "destructive" | "secondary" {
  return severity.toLowerCase() === "critical" ? "destructive" : "secondary";
}

export function HostCriticalEventsTab({ hostId, initialEvents }: Props) {
  const [severity, setSeverity] = useState("all");
  const [provider, setProvider] = useState("all");
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState<string | null>(initialEvents.length === 50 ? initialEvents.at(-1)?.id ?? null : null);
  const [loading, setLoading] = useState(false);
  const providers = useMemo(() => [...new Set(events.map((event) => event.provider))].sort(), [events]);
  const visible = events;
  async function loadPage(nextCursor?: string | null, replace = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (nextCursor) params.set("cursor", nextCursor);
      if (severity !== "all") params.set("severity", severity);
      if (provider !== "all") params.set("provider", provider);
      const response = await requestRemoteQuery<{ items: EventItem[]; nextCursor: string | null }>({ url: `/api/remote/hosts/${hostId}/critical-events?${params}`, method: "GET" });
      setEvents((current) => replace ? response.data.items : [...current, ...response.data.items]);
      setCursor(response.data.nextCursor);
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadPage(null, true); }, [hostId, severity, provider]);

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-destructive" /> Eventos críticos</CardTitle>
          <CardDescription>Últimos {events.length} eventos recebidos do Windows Event Log.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="critical">Crítica</SelectItem><SelectItem value="warning">Alerta</SelectItem></SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as origens</SelectItem>{providers.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"><Filter className="mx-auto mb-2 size-4" />Nenhum evento para os filtros selecionados.</div>
        ) : visible.map((event) => (
          <article key={event.id} className="rounded-lg border border-border/70 p-4">
            <div className="flex flex-wrap items-center gap-2"><Badge variant={severityVariant(event.severity)}>{event.severity}</Badge><Badge variant="outline">{event.provider} · {event.eventCode}</Badge><span className="ml-auto text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span></div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{event.message}</p>
          </article>
        ))}
        <div className="flex justify-center"><button type="button" className="text-sm text-primary disabled:text-muted-foreground" disabled={loading || !cursor} onClick={() => void loadPage(cursor)}>{loading ? "Carregando…" : "Carregar mais"}</button></div>
      </CardContent>
    </Card>
  );
}
