import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import type { RemoteConfiguredHostItem } from "@/features/remote/domain/remote-host.types";
import { trpc } from "@/lib/api/trpc-client";
import type { RemoteHostEntry } from "../chatwoot-dashboard-types";

export function useChatwootHosts({
  companyId,
  ticketNumber,
}: {
  companyId: string;
  ticketNumber: string;
}) {
  const [companyHosts, setCompanyHosts] = useState<RemoteHostEntry[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [hostReloadToken, setHostReloadToken] = useState(0);
  const [startingHostId, setStartingHostId] = useState<string | null>(null);
  const [isStartingSession, startSessionTransition] = useTransition();

  useEffect(() => {
    if (!companyId) {
      setCompanyHosts([]);
      setHostError(null);
      return;
    }

    let cancelled = false;

    async function loadHosts() {
      try {
        setIsLoadingHosts(true);
        setHostError(null);
        const json = await trpc.remote.directory.query();
        if (cancelled) return;
        const items: RemoteConfiguredHostItem[] = Array.isArray(json.items) ? json.items : [];
        const nextHosts = items
          .filter((item) => item.companyId === companyId)
          .map((item) => ({
            id: item.id,
            name: item.name.trim() || "Host sem nome",
            companyId: item.companyId,
            companyName: item.companyName,
            operationalStatus: item.operationalStatus,
            productStatus: item.productStatus,
            agent: {
              rustdeskId: item.agent.rustdeskId,
              lastHeartbeatAt: item.agent.lastHeartbeatAt,
            },
          }))
          .sort((a, b) => {
            const aHeartbeat = a.agent.lastHeartbeatAt ? Date.parse(a.agent.lastHeartbeatAt) : 0;
            const bHeartbeat = b.agent.lastHeartbeatAt ? Date.parse(b.agent.lastHeartbeatAt) : 0;
            return bHeartbeat - aHeartbeat;
          });
        setCompanyHosts(nextHosts);
      } catch {
        if (cancelled) return;
        setCompanyHosts([]);
        setHostError("Nao foi possivel carregar os hosts da empresa.");
      } finally {
        if (!cancelled) setIsLoadingHosts(false);
      }
    }

    void loadHosts();
    return () => {
      cancelled = true;
    };
  }, [companyId, hostReloadToken]);

  function handleStartHostSession(host: RemoteHostEntry) {
    const rustdeskId = host.agent.rustdeskId?.trim() || "";
    if (!rustdeskId) {
      toast.error("Host sem identificador remoto. Nao e possivel iniciar acesso.");
      return;
    }

    startSessionTransition(async () => {
      try {
        setStartingHostId(host.id);
        const result = await requestRemoteSessionAction({
          hostId: host.id,
          companyId: host.companyId,
          ticketNumber: ticketNumber || undefined,
          reason: ticketNumber
            ? `Acesso via Chatwoot para Ticket #${ticketNumber}`
            : "Acesso tecnico via Chatwoot",
        });

        if (!result.success) {
          toast.error(result.error ?? "Falha ao iniciar sessao auditada.");
          return;
        }

        toast.success("Sessao auditada iniciada.");
        window.location.href = `rustdesk://${rustdeskId}`;
      } catch {
        toast.error("Erro ao iniciar sessao remota.");
      } finally {
        setStartingHostId(null);
      }
    });
  }

  return {
    companyHosts,
    isLoadingHosts,
    hostError,
    hostReloadToken,
    setHostReloadToken,
    startingHostId,
    setStartingHostId,
    isStartingSession,
    recommendedHost: companyHosts[0] ?? null,
    handleStartHostSession,
  };
}
