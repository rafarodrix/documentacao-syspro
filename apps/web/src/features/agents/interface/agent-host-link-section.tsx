"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from "@dosc-syspro/ui";
import { AlertTriangle, Building2, ExternalLink, Link2, Loader2, Search, Unlink } from "lucide-react";
import type { AgentHostOption } from "@dosc-syspro/contracts/agent";
import { fetchAgentHostOptionsClient } from "@/features/agents/application/agent-client.queries";
import { patchAgentInstallation } from "@/features/agents/application/agent-write.actions";
import { SearchableCompanyPicker } from "@/features/remote/interface/host-details/components/searchable-company-picker";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";

function getStatusLabel(status: AgentHostOption["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "INACTIVE":
      return "Inativo";
    case "MAINTENANCE":
      return "Manutencao";
    default:
      return status;
  }
}

export function AgentHostLinkSection({
  deviceId,
  currentHostId,
  currentHostName,
  canManage,
  canManageRemote,
  companyOptions,
  matchedPendingHost,
}: {
  deviceId: string;
  currentHostId: string | null;
  currentHostName: string | null;
  canManage: boolean;
  canManageRemote: boolean;
  companyOptions: Array<{ id: string; label: string; searchText?: string }>;
  matchedPendingHost: { id: string; machineName: string | null; status: "PENDING_LINK" | "IGNORED" } | null;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hosts, setHosts] = useState<AgentHostOption[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [hostLoadError, setHostLoadError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyOptions[0]?.id ?? "");
  const [projectedHostName, setProjectedHostName] = useState(matchedPendingHost?.machineName ?? "");
  const [isLinking, startLinking] = useTransition();
  const [isUnlinking, startUnlinking] = useTransition();
  const [isLinkingPending, startLinkingPending] = useTransition();
  const [isReactivatingPending, startReactivatingPending] = useTransition();

  useEffect(() => {
    if (!pickerOpen) return;
    setIsLoadingHosts(true);
    setHostLoadError(null);
    fetchAgentHostOptionsClient(search)
      .then((items) => setHosts(items))
      .catch((error) => {
        setHosts([]);
        setHostLoadError(error instanceof Error ? error.message : "Falha ao carregar hosts.");
      })
      .finally(() => setIsLoadingHosts(false));
  }, [pickerOpen, search]);

  useEffect(() => {
    if (!selectedCompanyId && companyOptions[0]?.id) {
      setSelectedCompanyId(companyOptions[0].id);
    }
  }, [companyOptions, selectedCompanyId]);

  useEffect(() => {
    if (!projectedHostName && matchedPendingHost?.machineName) {
      setProjectedHostName(matchedPendingHost.machineName);
    }
  }, [matchedPendingHost, projectedHostName]);

  const trimmedProjectedHostName = projectedHostName.trim();
  const availableHosts = useMemo(() => hosts, [hosts]);

  function handleLink(hostId: string) {
    startLinking(async () => {
      try {
        await patchAgentInstallation(deviceId, { remoteHostId: hostId });
        toast.success("Host vinculado com sucesso.");
        setPickerOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao vincular host.");
      }
    });
  }

  function handleUnlink() {
    startUnlinking(async () => {
      try {
        await patchAgentInstallation(deviceId, { remoteHostId: null });
        toast.success("Host desvinculado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao desvincular host.");
      }
    });
  }

  function handleLinkPendingDiscovery() {
    if (!matchedPendingHost || !selectedCompanyId || !trimmedProjectedHostName) {
      toast.error("Selecione a empresa e informe o nome do host.");
      return;
    }

    if (matchedPendingHost.status === "IGNORED") {
      toast.error("Esta descoberta foi bloqueada no portal. Reautorize antes de vincular.");
      return;
    }

    startLinkingPending(async () => {
      try {
        const result = await requestRemoteMutation<{
          hostId: string;
          discoveredHostId: string;
          created: boolean;
        }>({
          url: `/api/remote/discovered-hosts/${matchedPendingHost.id}/link`,
          method: "POST",
          body: {
            companyId: selectedCompanyId,
            name: trimmedProjectedHostName,
          },
        });

        try {
          await patchAgentInstallation(deviceId, { remoteHostId: result.data.hostId });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `Host projetado, mas o vinculo do dispositivo falhou: ${error.message}`
              : "Host projetado, mas o vinculo do dispositivo falhou.",
          );
          router.refresh();
          return;
        }

        toast.success(result.data.created ? "Host criado e vinculado ao agente." : "Host existente vinculado ao agente.");
        setPickerOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleReactivatePendingDiscovery() {
    if (!matchedPendingHost) return;

    startReactivatingPending(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/discovered-hosts/${matchedPendingHost.id}/reactivate`,
          method: "POST",
        });
        toast.success("Descoberta reautorizada. Agora o host pode ser vinculado.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  return (
    <>
      <div className="rounded-lg border border-border/40 bg-background/50 p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Host remoto</p>
        {currentHostId && currentHostName ? (
          <Link
            href={`/portal/infraestrutura/hosts/${currentHostId}`}
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {currentHostName}
          </Link>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground">-</p>
        )}

        {canManage && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPickerOpen(true)}
              disabled={isLinking}
            >
              {isLinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              {currentHostId ? "Alterar host" : "Vincular host"}
            </Button>

            {currentHostId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                    disabled={isUnlinking}
                  >
                    {isUnlinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                    Desvincular
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desvincular host remoto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O agente deixara de apontar para este host no portal. Se o auto-link encontrar um match seguro no proximo ciclo, o vinculo pode reaparecer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnlink}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desvincular
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular host ao agente</DialogTitle>
            <DialogDescription>
              Primeiro tente vincular a um host existente. Se ainda nao existir host para esta maquina, use a descoberta pendente abaixo para criar e vincular no portal.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por host, empresa, machine name ou device vinculado..."
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {isLoadingHosts && (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando hosts...
              </div>
            )}

            {!isLoadingHosts && hostLoadError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {hostLoadError}
              </p>
            )}

            {!isLoadingHosts && !hostLoadError && availableHosts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum host existente encontrado neste escopo.
              </p>
            )}

            {!isLoadingHosts &&
              availableHosts.map((host) => {
                const linkedElsewhere = !!host.linkedDeviceId && host.linkedDeviceId !== deviceId;

                return (
                  <button
                    key={host.id}
                    type="button"
                    onClick={() => handleLink(host.id)}
                    disabled={isLinking || linkedElsewhere}
                    className="flex w-full items-start gap-3 rounded-lg border border-border/40 bg-background/50 p-3 text-left transition-colors hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="mt-0.5 rounded-full border border-border/50 p-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{host.name}</p>
                        <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {getStatusLabel(host.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {host.companyName ?? "Empresa nao identificada"}
                      </p>
                      {linkedElsewhere && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          Ja vinculado a {host.linkedDeviceHostname ?? host.linkedDeviceId}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {matchedPendingHost && canManageRemote && (
            <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div>
                <div className="flex items-center gap-2">
                  {matchedPendingHost.status === "IGNORED" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  ) : (
                    <Building2 className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  )}
                  <p className="text-sm font-medium text-foreground">
                    {matchedPendingHost.status === "IGNORED" ? "Descoberta bloqueada encontrada" : "Descoberta pendente encontrada"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {matchedPendingHost.status === "IGNORED"
                    ? `A maquina ${matchedPendingHost.machineName ?? "sem nome"} foi ignorada/removida anteriormente. Reautorize a descoberta para liberar o vinculo novamente.`
                    : `A maquina ${matchedPendingHost.machineName ?? "sem nome"} apareceu no fluxo de descoberta, mas ainda nao tem host configurado. Selecione a empresa para criar e vincular agora.`}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Empresa</p>
                <SearchableCompanyPicker
                  value={selectedCompanyId}
                  options={companyOptions}
                  searchUrl="/api/remote/companies/search"
                  onChange={setSelectedCompanyId}
                  hideUnlinked
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Nome do host</p>
                <Input
                  value={projectedHostName}
                  onChange={(event) => setProjectedHostName(event.target.value)}
                  placeholder="Ex.: SERVIDOR MATRIZ FISCAL"
                />
              </div>

              <Button
                type="button"
                onClick={matchedPendingHost.status === "IGNORED" ? handleReactivatePendingDiscovery : handleLinkPendingDiscovery}
                disabled={
                  matchedPendingHost.status === "IGNORED"
                    ? isReactivatingPending
                    : isLinkingPending || !selectedCompanyId || !trimmedProjectedHostName
                }
                className="gap-2"
              >
                {matchedPendingHost.status === "IGNORED" ? (
                  isReactivatingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />
                ) : isLinkingPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {matchedPendingHost.status === "IGNORED"
                  ? isReactivatingPending
                    ? "Reautorizando..."
                    : "Reautorizar descoberta"
                  : isLinkingPending
                    ? "Criando vinculo..."
                    : "Criar host e vincular"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
