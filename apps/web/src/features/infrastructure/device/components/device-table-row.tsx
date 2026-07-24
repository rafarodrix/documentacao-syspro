"use client";

import { useRouter } from "next/navigation";
import type { DeviceListItem } from "@dosc-syspro/contracts";
import { TableRow, TableCell } from "@dosc-syspro/ui";
import { DeviceCell } from "./device-cell";
import { CompanyCell } from "./company-cell";
import { ConnectivityCell } from "./connectivity-cell";
import { HealthCell } from "./health-cell";
import { CapabilitiesCell } from "./capabilities-cell";
import { deviceDetailPath } from "../domain/device-detail-paths";
import { DeviceActions } from "./device-actions";

type DeviceTableRowProps = {
  item: DeviceListItem;
  isAdmin?: boolean;
  canManage?: boolean;
  onConnect?: (item: DeviceListItem) => void;
  onCopyRustDeskId?: (id: string | null) => void;
  onLinkCompany?: (item: DeviceListItem) => void;
  onArchive?: (item: DeviceListItem) => void;
};

export function DeviceTableRow({
  item,
  isAdmin = false,
  canManage = true,
  onConnect,
  onCopyRustDeskId,
  onLinkCompany,
  onArchive,
}: DeviceTableRowProps) {
  const router = useRouter();
  const targetHref = deviceDetailPath(item);

  const handleRowClick = () => {
    router.push(targetHref);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      // Avoid triggering if event originated inside a button or menu
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON" || target.tagName === "A" || target.closest("button") || target.closest("a")) {
        return;
      }
      e.preventDefault();
      router.push(targetHref);
    }
  };

  return (
    <TableRow
      tabIndex={0}
      role="button"
      aria-label={`Ver detalhes do dispositivo ${item.displayName}`}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {/* Coluna Dispositivo */}
      <TableCell className="py-3 pl-4 pr-3 align-top min-w-[200px]">
        <DeviceCell item={item} isAdmin={isAdmin} />
      </TableCell>

      {/* Coluna Empresa */}
      <TableCell className="py-3 px-3 align-top min-w-[220px]">
        <CompanyCell item={item} onLinkCompany={onLinkCompany} />
      </TableCell>

      {/* Coluna Conectividade */}
      <TableCell className="py-3 px-3 align-top min-w-[150px]">
        <ConnectivityCell connectivity={item.connectivity} />
      </TableCell>

      {/* Coluna Saúde */}
      <TableCell className="py-3 px-3 align-top min-w-[150px]">
        <HealthCell health={item.health} />
      </TableCell>

      {/* Coluna Capacidades */}
      <TableCell className="py-3 px-3 align-top min-w-[140px]">
        <CapabilitiesCell item={item} />
      </TableCell>

      {/* Coluna Ações */}
      <TableCell className="py-3 pl-3 pr-4 align-top text-right min-w-[130px]" onClick={(e) => e.stopPropagation()}>
        <DeviceActions
          item={item}
          canManage={canManage}
          onConnect={onConnect}
          onCopyRustDeskId={onCopyRustDeskId}
          onLinkCompany={onLinkCompany}
          onArchive={onArchive}
        />
      </TableCell>
    </TableRow>
  );
}
