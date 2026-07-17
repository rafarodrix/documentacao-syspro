"use client";

import Link from "next/link";
import { ExternalLink, Loader2, MoreHorizontal, ShieldCheck, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dosc-syspro/ui";

type HostDirectoryActionsMenuProps = {
  hostId: string;
  canOpenRemote: boolean;
  isOpeningRemote: boolean;
  canManageRemote: boolean;
  detailsHref: string;
  onOpenRemote: () => void;
  onDelete: () => void;
};

export function HostDirectoryActionsMenu({
  canOpenRemote,
  isOpeningRemote,
  canManageRemote,
  detailsHref,
  onOpenRemote,
  onDelete,
}: HostDirectoryActionsMenuProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 px-3"
        onClick={onOpenRemote}
        disabled={!canOpenRemote || isOpeningRemote}
      >
        {isOpeningRemote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        Conectar
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-background/70">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={detailsHref} className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Detalhes
            </Link>
          </DropdownMenuItem>
          {canManageRemote && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(event) => {
                  event.preventDefault();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir host
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
