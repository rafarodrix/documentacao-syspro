"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ServerOff,
  MoreVertical,
  Trash2,
  Eye,
  ShieldAlert,
  ArrowUpCircle,
  KeyRound,
} from "lucide-react";
import type {
  AgentInstallationListResult,
  AgentInstallationSummary,
  AgentFleetStats,
} from "@dosc-syspro/contracts/agent";
import {
  isAgentVersionBelowTarget,
  supportsManagedAgentUpgrade,
} from "@dosc-syspro/contracts/remote";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@dosc-syspro/ui";
import { SearchToolbar } from "@/components/patterns";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import { formatInstallationHeartbeatLag } from "@/features/agents/domain/agent-installation-status";
import { agentFleetDetailPath } from "@/features/agents/domain/agent-fleet-paths";
import { deleteAgentInstallation, pruneInactiveDevices, getAgentRevocations, deleteAgentRevocation } from "@/features/agents/application/agent-write.actions";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";
import { toast } from "sonner";

type StatusFilter = "all" | "online" | "offline";

export function AgentDevicesPanel(props: {
  initialStats: AgentFleetStats;
  initialList: AgentInstallationListResult;
  initialSearch: string;
  agentTargetVersion?: string | null;
  agentAutoUpgrade?: boolean;
}) {
  const {
    initialStats,
    initialList,
    initialSearch,
    agentTargetVersion = null,
    agentAutoUpgrade = false,
  } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRefreshing, startRefresh] = useTransition();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [isPruneDialogOpen, setIsPruneDialogOpen] = useState(false);
  const [isRevocationsOpen, setIsRevocationsOpen] = useState(false);
  const [isPruning, startPruning] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = (searchParams.get("status") as StatusFilter | null) ?? "all";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const updateParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startRefresh(() => router.replace(`?${params.toString()}`, { scroll: false }));
  };

  const changePage = (next: number) => {
    updateParam({ page: String(next) });
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput === initialSearch) return;
    debounceRef.current = setTimeout(() => {
      updateParam({ search: searchInput.trim() || null, page: null });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const stats = initialStats;
  const list = initialList;
  const { pagination } = list;

  return (
    <div className="space-y-6">
      <SearchToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onClearSearch={() => {
          setSearchInput("");
          updateParam({ search: null, page: null });
        }}
        searchPlaceholder="Buscar por hostname, deviceId ou SO..."
        resultLabel={`${pagination.total} dispositivo${pagination.total === 1 ? "" : "s"}`}
        filters={
          <>
            <FilterPill
              label="Todos"
              count={stats.total}
              active={status === "all"}
              onClick={() => updateParam({ status: null, page: null })}
            />
            <FilterPill
              label="Online"
              count={stats.online}
              active={status === "online"}
              onClick={() => updateParam({ status: "online", page: null })}
              tone="emerald"
            />
            <FilterPill
              label="Offline"
              count={stats.offline}
              active={status === "offline"}
              onClick={() => updateParam({ status: "offline", page: null })}
              tone="amber"
            />
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 border-dashed border-muted-foreground/30 hover:border-yellow-500/50 hover:bg-yellow-500/5 hover:text-yellow-600 dark:hover:text-yellow-400"
              onClick={() => setIsRevocationsOpen(true)}
              title="Visualizar e gerenciar exclusões de hardware"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Gerenciar Bloqueios</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 border-dashed border-muted-foreground/30 hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400"
              onClick={() => setIsPruneDialogOpen(true)}
              disabled={isRefreshing || stats.offline === 0}
              title="Limpar todos os agentes sem conexão há mais de 30 dias"
            >
              <Trash2 className="h-4 w-4" />
              <span>Limpar Inativos</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Recarregar"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        }
      />

      <ConfirmActionDialog
        open={isPruneDialogOpen}
        onOpenChange={setIsPruneDialogOpen}
        title="Limpar agentes inativos?"
        description="Isso excluirá permanentemente todos os dispositivos não vinculados que estão offline há mais de 30 dias. Esta operação não pode ser desfeita."
        confirmLabel="Confirmar Limpeza"
        cancelLabel="Cancelar"
        isLoading={isPruning}
        variant="danger"
        onConfirm={() => {
          startPruning(async () => {
            try {
              const res = await pruneInactiveDevices();
              toast.success(`Limpeza concluída! ${res.deletedDevices} dispositivo(s) e ${res.deletedDiscovered} registro(s) de descoberta limpos.`);
              setIsPruneDialogOpen(false);
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Erro ao limpar inativos.");
            }
          });
        }}
      />

      <RevocationsDialog
        open={isRevocationsOpen}
        onOpenChange={setIsRevocationsOpen}
      />

      {agentTargetVersion ? (
        <p className="text-xs text-muted-foreground">
          Versão alvo da frota: <span className="font-mono text-foreground">{agentTargetVersion}</span>
          {agentAutoUpgrade ? " · auto-upgrade ativo" : " · auto-upgrade desligado"}
        </p>
      ) : null}

      <DevicesTable
        items={list.items}
        agentTargetVersion={agentTargetVersion}
      />

      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <span className="text-xs text-muted-foreground">
          {pagination.total === 0
            ? "Nenhum dispositivo"
            : `${(page - 1) * pagination.pageSize + 1}-${Math.min(page * pagination.pageSize, pagination.total)} de ${pagination.total} dispositivos`}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1 || isRefreshing}
            onClick={() => changePage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs tabular-nums text-muted-foreground">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={page >= pagination.totalPages || isRefreshing}
            onClick={() => changePage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterPill(props: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "emerald" | "amber";
}) {
  const tone = props.tone ?? "default";
  const activeClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "border-foreground bg-foreground text-background";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors " +
        (props.active ? activeClass : "border-border bg-background text-muted-foreground hover:bg-muted")
      }
    >
      <span>{props.label}</span>
      <span className="text-[10px] opacity-70">{props.count}</span>
    </button>
  );
}

function DevicesTable({
  items,
  agentTargetVersion,
}: {
  items: AgentInstallationSummary[];
  agentTargetVersion: string | null;
}) {
  const columns = useMemo<ColumnDef<AgentInstallationSummary>[]>(() => [
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusDot online={row.original.isOnline} />,
    },
    {
      id: "hostname",
      header: "Hostname",
      cell: ({ row }) => (
        <Link
          href={agentFleetDetailPath(row.original.deviceId)}
          className="text-sm font-medium transition-colors hover:text-primary hover:underline"
        >
          {row.original.hostname ?? <span className="font-normal text-muted-foreground">-</span>}
        </Link>
      ),
    },
    {
      id: "os",
      header: "SO",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.os ?? "-"}</span>,
    },
    {
      id: "company",
      header: "Empresa",
      cell: ({ row }) =>
        row.original.companyName ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="max-w-35 truncate">{row.original.companyName}</span>
          </span>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            sem vinculo
          </Badge>
        ),
    },
    {
      id: "remoteHost",
      header: "Host remoto",
      cell: ({ row }) =>
        row.original.remoteHostId && row.original.remoteHostName ? (
          <Link
            href={`/portal/infraestrutura/dispositivos/${row.original.remoteHostId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="max-w-35 truncate">{row.original.remoteHostName}</span>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      id: "version",
      header: "Versao",
      cell: ({ row }) => (
        <VersionCell
          agentVersion={row.original.agentVersion}
          targetVersion={agentTargetVersion}
        />
      ),
    },
    {
      id: "auth",
      header: "Auth",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.hasInstallationToken
              ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
              : "text-[10px] text-muted-foreground"
          }
          title={
            row.original.hasInstallationToken
              ? `Token emitido${row.original.installationTokenLastUsedAt ? ` · ultimo uso ${row.original.installationTokenLastUsedAt}` : ""}`
              : "Sem installation token (legado / INTERNAL_API_KEY)"
          }
        >
          <KeyRound className="mr-1 h-3 w-3" />
          {row.original.hasInstallationToken ? "Token" : "Legado"}
        </Badge>
      ),
    },
    {
      id: "heartbeat",
      header: "Ultimo heartbeat",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelativeTime(row.original.lastHeartbeatAt, row.original.heartbeatLagSeconds)}</span>,
    },
    {
      id: "deviceId",
      header: () => <div className="text-right">Device ID</div>,
      meta: { className: "text-right" },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.original.deviceId.slice(0, 12)}...
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      meta: { className: "text-right w-12" },
      cell: ({ row }) => (
        <DeviceRowActions
          device={row.original}
          agentTargetVersion={agentTargetVersion}
        />
      ),
    },
  ], [agentTargetVersion]);

  const renderMobileItem = (item: AgentInstallationSummary) => (
    <Link
      href={agentFleetDetailPath(item.deviceId)}
      className="block space-y-3 p-4 transition-colors hover:bg-muted/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.hostname ?? "Sem hostname"}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.os ?? "SO nao informado"}</p>
        </div>
        <StatusDot online={item.isOnline} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {item.companyName ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="max-w-45 truncate">{item.companyName}</span>
          </span>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            sem vinculo
          </Badge>
        )}
        <VersionCell agentVersion={item.agentVersion} targetVersion={agentTargetVersion} />
        <Badge variant="outline" className="text-[10px]">
          {item.hasInstallationToken ? "Token" : "Legado"}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>{formatRelativeTime(item.lastHeartbeatAt, item.heartbeatLagSeconds)}</span>
        <span className="font-mono">{item.deviceId.slice(0, 12)}...</span>
      </div>
    </Link>
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      flexible={true}
      minWidthClassName="min-w-[1180px]"
      emptyState={{
        title: "Nenhum dispositivo encontrado",
        description: "Ajuste filtros ou aguarde o proximo heartbeat dos agentes.",
        icon: ServerOff,
      }}
      rowClassName="hover:bg-muted/40"
      renderMobileItem={renderMobileItem}
    />
  );
}

function VersionCell({
  agentVersion,
  targetVersion,
}: {
  agentVersion: string | null;
  targetVersion: string | null;
}) {
  const outdated = Boolean(targetVersion && isAgentVersionBelowTarget(agentVersion, targetVersion));
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`font-mono text-xs ${outdated ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
        {agentVersion ?? "-"}
      </span>
      {outdated ? (
        <span className="text-[10px] text-amber-700 dark:text-amber-400">
          abaixo de {targetVersion}
        </span>
      ) : null}
    </span>
  );
}

function StatusDot({ online }: { online: boolean }) {
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
      Offline
    </span>
  );
}

function formatRelativeTime(iso: string | null, lagSeconds: number | null): string {
  if (!iso || lagSeconds === null) return "nunca";
  return formatInstallationHeartbeatLag(lagSeconds);
}

function DeviceRowActions({
  device,
  agentTargetVersion,
}: {
  device: AgentInstallationSummary;
  agentTargetVersion: string | null;
}) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [isUpgrading, startUpgrading] = useTransition();
  const canUpgrade =
    Boolean(device.remoteHostId) &&
    supportsManagedAgentUpgrade(device.agentVersion) &&
    Boolean(agentTargetVersion && isAgentVersionBelowTarget(device.agentVersion, agentTargetVersion));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link
              href={agentFleetDetailPath(device.deviceId)}
              className="flex cursor-pointer items-center gap-2"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>Visualizar</span>
            </Link>
          </DropdownMenuItem>
          {device.remoteHostId ? (
            <DropdownMenuItem asChild>
              <Link
                href={`/portal/infraestrutura/dispositivos/${device.remoteHostId}`}
                className="flex cursor-pointer items-center gap-2"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span>Abrir dispositivo</span>
              </Link>
            </DropdownMenuItem>
          ) : null}
          {canUpgrade ? (
            <DropdownMenuItem
              disabled={isUpgrading}
              onSelect={(event) => {
                event.preventDefault();
                startUpgrading(async () => {
                  try {
                    const result = await requestRemoteMutation<Record<string, unknown>>({
                      url: `/api/remote/hosts/${device.remoteHostId}/actions`,
                      method: "POST",
                      body: { action: "UPGRADE_AGENT" },
                    });
                    toast.success(
                      (typeof result.message === "string" && result.message) ||
                        "Upgrade do agente enfileirado. Acompanhe no dispositivo.",
                    );
                    router.refresh();
                  } catch (error) {
                    toast.error(getRemoteApiErrorMessage(error));
                  }
                });
              }}
            >
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
              <span>{isUpgrading ? "Agendando..." : "Atualizar agente"}</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              setIsDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Excluir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmActionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir agente?"
        description={`O dispositivo "${device.hostname ?? device.deviceId}" sera removido e bloqueado ate reinstalacao.`}
        confirmLabel="Excluir agente"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        variant="danger"
        onConfirm={() => {
          startDeleting(async () => {
            try {
              await deleteAgentInstallation(device.deviceId);
              toast.success("Agente excluido.");
              setIsDeleteOpen(false);
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Erro ao excluir agente.");
            }
          });
        }}
      />
    </>
  );
}

function RevocationsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, onOpenChange } = props;
  const [items, setItems] = useState<Array<{ deviceId: string; hostname: string | null; revokedAt: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getAgentRevocations();
      setItems(data);
    } catch (err) {
      toast.error("Erro ao carregar lista de bloqueios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  const handleUnblock = async (deviceId: string) => {
    setIsDeleting(deviceId);
    try {
      await deleteAgentRevocation(deviceId);
      toast.success("Dispositivo desbloqueado com sucesso!");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover bloqueio");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <ShieldAlert className="h-5 w-5" />
            <span>Gerenciar Dispositivos Bloqueados</span>
          </DialogTitle>
          <DialogDescription>
            Quando um agente é excluído, o ID de hardware dele é colocado em uma lista de bloqueio para evitar que a máquina se registre novamente de forma automática. Remova o bloqueio abaixo se desejar reinstalar o agente nesta máquina.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              Nenhum dispositivo bloqueado no momento.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                  <th className="p-3 text-left">Hostname</th>
                  <th className="p-3 text-left">Device ID</th>
                  <th className="p-3 text-left">Bloqueado em</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.deviceId} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{item.hostname || "-"}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{item.deviceId}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(item.revokedAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                        disabled={isDeleting !== null}
                        onClick={() => handleUnblock(item.deviceId)}
                      >
                        {isDeleting === item.deviceId ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        <span>Desbloquear</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
