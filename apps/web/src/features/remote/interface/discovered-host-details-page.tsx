"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Clock3, Copy, ExternalLink, Loader2, Monitor, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Input, Label } from "@dosc-syspro/ui";
import type { RemoteDiscoveredHostDetails } from "@/features/remote/domain/remote-host.types";
import {
  buildPendingIdentitySubtitle,
  formatRustDeskDisplay,
  getHeartbeatMetaAt,
} from "@/features/remote/interface/directory-page.helpers";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";
import {
  copyTextWithFallback,
  formatDateTime,
  formatRelativeHeartbeat,
  getServiceStatusMeta,
} from "./host-details/host-details.helpers";
import { SearchableCompanyPicker } from "./host-details/components/searchable-company-picker";

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right text-foreground">{value}</span>
    </div>
  );
}

export function RemoteDiscoveredHostDetailsPanel({
  details,
}: {
  details: RemoteDiscoveredHostDetails;
}) {
  const router = useRouter();
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    details.suggestedCompanyId ?? details.companyOptions[0]?.id ?? "",
  );
  const [projectedHostName, setProjectedHostName] = useState(details.host.machineName ?? "");
  const [isLinking, startLinkTransition] = useTransition();
  const [isIgnoring, startIgnoreTransition] = useTransition();
  const [isReactivating, startReactivateTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
  }, []);

  const normalizedRustdeskId = details.host.rustdeskId?.replace(/\s+/g, "").trim() ?? "";
  const canOpenRemote = normalizedRustdeskId.length > 0;
  const heartbeatMeta = getHeartbeatMetaAt(details.host.lastHeartbeatAt, Date.now());
  const serviceStatusMeta = getServiceStatusMeta(details.host.serviceStatus);
  const companySuggestionLabel =
    details.companyOptions.find((option) => option.id === details.suggestedCompanyId)?.label ?? null;
  const trimmedProjectedHostName = projectedHostName.trim();

  async function handleCopyRustdeskId() {
    if (!normalizedRustdeskId) {
      toast.error("ID remoto nao informado.");
      return;
    }

    try {
      await copyTextWithFallback(normalizedRustdeskId);
      toast.success("ID remoto copiado.");
    } catch {
      toast.error("Falha ao copiar o ID remoto.");
    }
  }

  function handleOpenRemote() {
    if (!normalizedRustdeskId) {
      toast.error("Maquina descoberta sem RustDesk ID.");
      return;
    }

    const href = isMobileClient ? `rustdesk://[${normalizedRustdeskId}]` : `rustdesk://${normalizedRustdeskId}`;
    window.location.href = href;
    toast("Acesso aberto sem auditoria formal. Vincule o host para registrar as proximas sessoes.");
  }

  function handleLinkHost() {
    if (details.host.status === "IGNORED") {
      toast.error("Esta descoberta esta bloqueada. Reautorize antes de vincular.");
      return;
    }

    if (!selectedCompanyId || !trimmedProjectedHostName) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    startLinkTransition(async () => {
      try {
        const result = await requestRemoteMutation<{
          hostId: string;
          discoveredHostId: string;
          created: boolean;
        }>({
          url: `/api/remote/discovered-hosts/${details.host.id}/link`,
          method: "POST",
          body: {
            companyId: selectedCompanyId,
            name: trimmedProjectedHostName,
          },
        });

        toast.success(result.data.created ? "Host criado e vinculado." : "Host existente vinculado com sucesso.");
        router.push(`/portal/infraestrutura/dispositivos/${result.data.hostId}`);
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleReactivateHost() {
    startReactivateTransition(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/discovered-hosts/${details.host.id}/reactivate`,
          method: "POST",
        });
        toast.success("Descoberta reautorizada.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleIgnoreHost() {
    startIgnoreTransition(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/discovered-hosts/${details.host.id}/ignore`,
          method: "POST",
        });
        toast.success("Host descoberto ignorado.");
        router.push("/portal/infraestrutura?tab=hosts");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
              <Link href="/portal/infraestrutura?tab=hosts">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Voltar para hosts
              </Link>
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {details.host.status === "IGNORED" ? "Bloqueado" : "Sem vinculo"}
              </Badge>
              <Badge variant="outline" className={heartbeatMeta.className}>
                {heartbeatMeta.label}
              </Badge>
              <Badge variant="outline" className={serviceStatusMeta.tone}>
                {serviceStatusMeta.label}
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {details.host.machineName?.trim() || "Maquina descoberta sem nome"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {buildPendingIdentitySubtitle(details.host)}
              </p>
              {details.host.description ? (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{details.host.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleCopyRustdeskId} disabled={!canOpenRemote}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar ID
            </Button>
            <Button type="button" onClick={handleOpenRemote} disabled={!canOpenRemote}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Abrir acesso
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          {details.host.status === "IGNORED"
            ? "Esta descoberta foi bloqueada pelo portal. Reautorize a maquina para voltar ao fluxo normal de vinculo."
            : "Enquanto a maquina estiver sem vinculo, o acesso remoto abre direto no RustDesk e nao gera sessao auditada no portal."}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="space-y-4">
          <InfoCard title="Resumo tecnico">
            <InfoRow label="RustDesk ID" value={formatRustDeskDisplay(details.host.rustdeskId)} />
            <InfoRow label="Heartbeat" value={formatRelativeHeartbeat(details.host.lastHeartbeatAt)} />
            <InfoRow label="Primeira deteccao" value={formatDateTime(details.firstSeenAt)} />
            <InfoRow label="Ultima atualizacao" value={formatDateTime(details.updatedAt)} />
            <InfoRow label="Provider" value={details.host.provider ?? "Nao informado"} />
            <InfoRow label="Ambiente" value={details.host.environment ?? "Nao informado"} />
            <InfoRow label="Versao do agente" value={details.host.agentVersion ?? "Nao informado"} />
          </InfoCard>

          <InfoCard title="Telemetria rapida">
            <InfoRow label="Sistema" value={details.host.lastAgentMetrics?.osInfo ?? "Sem leitura"} />
            <InfoRow
              label="CPU"
              value={details.host.lastAgentMetrics?.cpuLoad != null ? `${details.host.lastAgentMetrics.cpuLoad}%` : "Sem leitura"}
            />
            <InfoRow
              label="RAM"
              value={details.host.lastAgentMetrics?.ramUsedPc != null ? `${details.host.lastAgentMetrics.ramUsedPc}%` : "Sem leitura"}
            />
            <InfoRow
              label="Disco livre"
              value={
                details.host.lastAgentMetrics?.diskFree != null
                  ? `${details.host.lastAgentMetrics.diskFree}`
                  : "Sem leitura"
              }
            />
          </InfoCard>

          <InfoCard title="Empresas detectadas">
            {details.host.installationCompanies.length ? (
              <div className="flex flex-wrap gap-2">
                {details.host.installationCompanies.map((company) => (
                  <Badge key={company} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    <Building2 className="mr-1 h-3 w-3" />
                    {company}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma instalacao Syspro foi reconhecida no ultimo heartbeat.
              </p>
            )}
          </InfoCard>
        </div>

        <InfoCard title="Vincular no portal">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="font-medium">Host projetado</span>
            </div>
            <p className="mt-2">
              {details.host.status === "IGNORED"
                ? "A descoberta esta bloqueada. Reautorize primeiro para devolver esta maquina ao fluxo de vinculo."
                : "Defina a empresa e o nome final do host. Depois do vinculo, esta maquina passa a ter pagina completa, sessoes auditadas e governanca remota normal."}
            </p>
            {companySuggestionLabel ? (
              <p className="mt-2 text-xs">
                Sugestao automatica de empresa: <span className="font-medium text-foreground">{companySuggestionLabel}</span>
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Empresa</Label>
            <SearchableCompanyPicker
              value={selectedCompanyId}
              options={details.companyOptions}
              searchUrl="/api/remote/companies/search"
              onChange={setSelectedCompanyId}
            />
          </div>

          <div className="space-y-2">
            <Label>Nome do host</Label>
            <Input
              value={projectedHostName}
              onChange={(event) => setProjectedHostName(event.target.value)}
              placeholder="Ex.: SERVIDOR MATRIZ FISCAL"
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/50 bg-muted/10 p-3 text-sm">
            <InfoRow label="Heartbeat" value={formatRelativeHeartbeat(details.host.lastHeartbeatAt)} />
            <InfoRow label="Ultima leitura" value={formatDateTime(details.updatedAt)} />
            <InfoRow label="Status do servico" value={serviceStatusMeta.label} />
            <InfoRow label="ID remoto" value={formatRustDeskDisplay(details.host.rustdeskId)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleLinkHost}
              disabled={details.host.status === "IGNORED" || isLinking || !selectedCompanyId || !trimmedProjectedHostName}
            >
              {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              {isLinking ? "Vinculando..." : "Vincular host"}
            </Button>
            {details.host.status === "IGNORED" && (
              <Button type="button" variant="secondary" onClick={handleReactivateHost} disabled={isReactivating}>
                {isReactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {isReactivating ? "Reautorizando..." : "Reautorizar descoberta"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleIgnoreHost} disabled={isIgnoring}>
              {isIgnoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
              {isIgnoring ? "Ignorando..." : "Ignorar descoberta"}
            </Button>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
