"use client";

import Link from "next/link";
import {
  Copy,
  Eye,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Building2,
  Archive,
  Edit,
  Activity,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import type { DeviceListItem } from "@dosc-syspro/contracts";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dosc-syspro/ui";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";
import { deviceDetailHref, deviceDetailPath, isManagedDeviceListItem } from "../domain/device-detail-paths";

type DeviceActionsProps = {
  item: DeviceListItem;
  onConnect?: (item: DeviceListItem) => void;
  onCopyRustDeskId?: (id: string | null) => void;
  onLinkCompany?: (item: DeviceListItem) => void;
  onArchive?: (item: DeviceListItem) => void;
  canManage?: boolean;
};

export function DeviceActions({
  item,
  onConnect,
  onCopyRustDeskId,
  onLinkCompany,
  onArchive,
  canManage = true,
}: DeviceActionsProps) {
  const detailsHref = deviceDetailPath(item);
  const isManaged = isManagedDeviceListItem(item);
  const isConnectable = item.remote.isOperational && !!item.remote.externalId;
  const [isRequestingAgentUpgrade, startRequestingAgentUpgrade] = useTransition();

  const handleCopyId = () => {
    if (!item.remote.externalId) {
      toast.error("ID remoto não configurado.");
      return;
    }
    if (onCopyRustDeskId) {
      onCopyRustDeskId(item.remote.externalId);
    } else {
      navigator.clipboard.writeText(item.remote.externalId);
      toast.success("ID remoto copiado.");
    }
  };

  const handleRequestAgentUpgrade = () => {
    startRequestingAgentUpgrade(async () => {
      try {
        const result = await requestRemoteMutation<Record<string, unknown>>({
          url: `/api/remote/hosts/${item.id}/actions`,
          method: "POST",
          body: { action: "UPGRADE_AGENT" },
        });
        toast.success(
          result.message ?? "Atualização incremental do agente enfileirada. Acompanhe o status no dispositivo.",
        );
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  };

  return (
    <div
      className="flex items-center justify-end gap-1.5 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {isConnectable ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-xs"
          onClick={() => onConnect?.(item)}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Conectar
        </Button>
      ) : (
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-medium border-border/60 bg-background"
        >
          <Link href={detailsHref}>
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            Ver dispositivo
          </Link>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/60 bg-background hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={detailsHref} className="flex items-center gap-2 cursor-pointer">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Ver dispositivo
            </Link>
          </DropdownMenuItem>

          {item.remote.externalId && (
            <DropdownMenuItem onClick={handleCopyId} className="flex items-center gap-2 cursor-pointer">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              Copiar ID RustDesk
            </DropdownMenuItem>
          )}

          {isManaged && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href={deviceDetailHref(item, { tab: "diagnostico" })}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                  Executar diagnóstico
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={deviceDetailHref(item, { tab: "eventos" })}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  Ver eventos
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {canManage && isManaged && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={deviceDetailHref(item, { edit: true })}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  Editar identificação
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleRequestAgentUpgrade}
                disabled={isRequestingAgentUpgrade}
                className="flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                {isRequestingAgentUpgrade ? "Agendando atualização..." : "Atualizar agente"}
              </DropdownMenuItem>

              {!item.company.id && onLinkCompany && (
                <DropdownMenuItem
                  onClick={() => onLinkCompany(item)}
                  className="flex items-center gap-2 text-primary font-medium cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Vincular empresa
                </DropdownMenuItem>
              )}

              {onArchive && (
                <DropdownMenuItem
                  onClick={() => onArchive(item)}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Arquivar dispositivo
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
