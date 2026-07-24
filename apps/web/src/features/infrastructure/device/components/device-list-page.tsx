"use client";

import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import type { DeviceConnectivityStatus, DeviceHealthStatus, DeviceListItem } from "@dosc-syspro/contracts";
import { useDeviceSearchParams } from "../hooks/use-device-search-params";
import { useDeviceListQuery } from "../hooks/use-device-list-query";
import { useRustDeskConnect } from "../hooks/use-rustdesk-connect";
import { DeviceSearchInput } from "./device-search-input";
import { DeviceFilterPopover } from "./device-filter-popover";
import { DeviceActiveFilters } from "./device-active-filters";
import { DeviceLifecycleTabs } from "./device-lifecycle-tabs";
import { DeviceListSummaryBar } from "./device-list-summary";
import { DeviceTable } from "./device-table";
import { DeviceEmptyState } from "./device-empty-state";
import { DeviceListSkeleton } from "./device-list-skeleton";
import { CreateDeviceSheetFromUrl } from "./create-device-sheet";

type CompanyOption = { id: string; label: string; searchText?: string };

type DeviceListPageProps = {
  initialCompanyId?: string;
  initialTicketNumber?: string;
  canManageRemote?: boolean;
  isAdmin?: boolean;
  companyOptions?: CompanyOption[];
};

export function DeviceListPage({
  initialCompanyId,
  initialTicketNumber,
  canManageRemote = true,
  isAdmin = true,
  companyOptions = [],
}: DeviceListPageProps) {
  const { queryParams, activeFilterCount, updateParams } = useDeviceSearchParams();
  const { data, isLoading, error, refetch } = useDeviceListQuery(queryParams);
  const { connect } = useRustDeskConnect();

  const handleSearchChange = (query: string) => {
    updateParams({ query, page: 1 });
  };

  const handleLifecycleChange = (lifecycle: string) => {
    updateParams({ lifecycle, page: 1 });
  };

  const handleApplyAdvancedFilters = (filters: {
    connectivity: DeviceConnectivityStatus | "ALL";
    health: DeviceHealthStatus | "ALL";
  }) => {
    updateParams({
      connectivity: filters.connectivity,
      health: filters.health,
      page: 1,
    });
  };

  const handleSortChange = (sort: string) => {
    updateParams({ sort, page: 1 }, false);
  };

  const handlePageChange = (page: number) => {
    updateParams({ page }, false);
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateParams({ pageSize, page: 1 });
  };

  const handleResetAllFilters = () => {
    updateParams({
      query: null,
      connectivity: null,
      health: null,
      companyId: null,
      page: 1,
    });
  };

  const handleRemoveConnectivity = () => updateParams({ connectivity: null, page: 1 });
  const handleRemoveHealth = () => updateParams({ health: null, page: 1 });
  const handleRemoveCompany = () => updateParams({ companyId: null, page: 1 });

  const handleConnect = (item: DeviceListItem) => {
    connect({
      externalId: item.remote.externalId,
      hostId: item.id,
      companyId: item.company.id,
      ticketNumber: initialTicketNumber ?? item.lastTicketNumber,
      reason: `Acesso remoto assistido para ${item.displayName}`,
      audit: true,
    });
  };

  const handleCopyRustDeskId = (id: string | null) => {
    if (!id) {
      toast.error("ID remoto não configurado.");
      return;
    }
    navigator.clipboard.writeText(id);
    toast.success("ID remoto copiado com sucesso.");
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 25, totalItems: 0, totalPages: 1 };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-card p-3.5 shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <DeviceSearchInput value={queryParams.query ?? ""} onChange={handleSearchChange} />

          <DeviceFilterPopover
            connectivity={queryParams.connectivity ?? "ALL"}
            health={queryParams.health ?? "ALL"}
            activeFilterCount={activeFilterCount}
            onApplyFilters={handleApplyAdvancedFilters}
            onClearFilters={handleResetAllFilters}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => refetch()}
            aria-label="Atualizar dispositivos"
            title="Atualizar dispositivos"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <DeviceActiveFilters
          connectivity={queryParams.connectivity ?? "ALL"}
          health={queryParams.health ?? "ALL"}
          companyId={queryParams.companyId}
          onRemoveConnectivity={handleRemoveConnectivity}
          onRemoveHealth={handleRemoveHealth}
          onRemoveCompany={handleRemoveCompany}
          onClearAll={handleResetAllFilters}
        />

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/40">
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

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
          <span>{error.message}</span>
          <button type="button" onClick={refetch} className="underline font-semibold">
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <DeviceListSkeleton />
      ) : items.length > 0 ? (
        <DeviceTable
          items={items}
          pagination={pagination}
          isAdmin={isAdmin}
          canManage={canManageRemote}
          sort={queryParams.sort}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onConnect={handleConnect}
          onCopyRustDeskId={handleCopyRustDeskId}
        />
      ) : (
        <DeviceEmptyState
          hasSearchQuery={!!queryParams.query}
          activeLifecycle={queryParams.lifecycle ?? "MANAGED"}
          onClearSearch={handleResetAllFilters}
        />
      )}

      <CreateDeviceSheetFromUrl
        canManage={canManageRemote}
        companyOptions={companyOptions}
        initialCompanyId={queryParams.companyId ?? initialCompanyId}
      />
    </div>
  );
}
