"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DeviceListItem } from "@dosc-syspro/contracts";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import { useDeviceSearchParams } from "../hooks/use-device-search-params";
import { useDeviceListQuery } from "../hooks/use-device-list-query";
import { DeviceSearchInput } from "./device-search-input";
import { DeviceLifecycleTabs } from "./device-lifecycle-tabs";
import { DeviceFilters } from "./device-filters";
import { DeviceListSummaryBar } from "./device-list-summary";
import { DeviceTable } from "./device-table";
import { DeviceEmptyState } from "./device-empty-state";

type DeviceListPageProps = {
  initialCompanyId?: string;
  initialTicketNumber?: string;
  canManageRemote?: boolean;
  isAdmin?: boolean;
};

export function DeviceListPage({
  initialCompanyId,
  initialTicketNumber,
  canManageRemote = true,
  isAdmin = true,
}: DeviceListPageProps) {
  const { queryParams, updateParams } = useDeviceSearchParams();
  const { data, isLoading, error, refetch } = useDeviceListQuery(queryParams);

  const [isMobileClient, setIsMobileClient] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
  }, []);

  const handleSearchChange = (query: string) => {
    updateParams({ query, page: 1 });
  };

  const handleLifecycleChange = (lifecycle: string) => {
    updateParams({ lifecycle, page: 1 });
  };

  const handleConnectivityChange = (connectivity: string) => {
    updateParams({ connectivity, page: 1 });
  };

  const handleHealthChange = (health: string) => {
    updateParams({ health, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page }, false);
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateParams({ pageSize, page: 1 });
  };

  const handleResetFilters = () => {
    updateParams({
      query: null,
      connectivity: null,
      health: null,
      companyId: null,
      page: 1,
    });
  };

  const handleConnect = async (item: DeviceListItem) => {
    const rawId = item.remote.externalId?.replace(/\s+/g, "").trim() ?? "";
    if (!rawId) {
      toast.error("Dispositivo sem ID remoto. Não é possível iniciar sessão.");
      return;
    }

    const href = isMobileClient ? `rustdesk://[${rawId}]` : `rustdesk://${rawId}`;
    window.location.href = href;

    try {
      const result = await requestRemoteSessionAction({
        hostId: item.id,
        companyId: item.company.id || undefined,
        ticketNumber: initialTicketNumber ?? item.lastTicketNumber ?? undefined,
        reason: `Acesso remoto assistido para ${item.displayName}`,
      });

      if (!result.success) {
        toast.error(result.error ?? "Falha ao registrar auditoria da sessão.");
      }
    } catch {
      // Protocol was launched, session audit registration failure is secondary
    }
  };

  const handleCopyRustDeskId = (id: string | null) => {
    if (!id) {
      toast.error("ID remoto não configurado.");
      return;
    }
    navigator.clipboard.writeText(id);
    toast.success("ID remoto copiado com sucesso.");
  };

  const hasActiveFilters =
    !!queryParams.query ||
    queryParams.connectivity !== "ALL" ||
    queryParams.health !== "ALL" ||
    !!queryParams.companyId;

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 25, totalItems: 0, totalPages: 1 };

  return (
    <div className="space-y-3">
      {/* Search & Filter Header Container */}
      <div className="rounded-lg border border-border/60 bg-card p-3.5 shadow-xs flex flex-col gap-3">
        {/* Search input */}
        <DeviceSearchInput
          value={queryParams.query ?? ""}
          onChange={handleSearchChange}
        />

        {/* Filter Selects */}
        <DeviceFilters
          connectivity={queryParams.connectivity ?? "ALL"}
          health={queryParams.health ?? "ALL"}
          onConnectivityChange={handleConnectivityChange}
          onHealthChange={handleHealthChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Lifecycle Tabs and Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-border/40">
          <DeviceLifecycleTabs
            activeTab={queryParams.lifecycle ?? "MANAGED"}
            onTabChange={handleLifecycleChange}
            summary={data?.summary}
            canCreateHosts={canManageRemote}
          />

          <DeviceListSummaryBar
            summary={data?.summary}
            activeLifecycle={queryParams.lifecycle ?? "MANAGED"}
            query={queryParams.query}
            totalFilteredItems={pagination.totalItems}
          />
        </div>
      </div>

      {/* Loading Skeleton or Error Banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
          <span>{error.message}</span>
          <button type="button" onClick={refetch} className="underline font-semibold">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Main Table or Empty State */}
      {isLoading ? (
        <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-xs text-muted-foreground animate-pulse">
          Carregando dispositivos...
        </div>
      ) : items.length > 0 ? (
        <DeviceTable
          items={items}
          pagination={pagination}
          isAdmin={isAdmin}
          canManage={canManageRemote}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onConnect={handleConnect}
          onCopyRustDeskId={handleCopyRustDeskId}
        />
      ) : (
        <DeviceEmptyState
          hasSearchQuery={!!queryParams.query}
          activeLifecycle={queryParams.lifecycle ?? "MANAGED"}
          onClearSearch={handleResetFilters}
        />
      )}
    </div>
  );
}
