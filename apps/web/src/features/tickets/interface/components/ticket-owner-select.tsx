"use client";

import { useEffect, useState } from "react";
import { Check, Search, UserRound } from "lucide-react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger, ScrollArea } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import type { InternalUserOption } from "@/features/user-access/interface/hooks/use-internal-users";
import { EditableSidebarField, SidebarField } from "./ticket-sidebar-fields";
import type { TicketDetailsItem } from "./ticket-view.types";

export function getAssignableUsers(users: InternalUserOption[], team: "SUPORTE" | "DESENVOLVIMENTO") {
  return users.filter((user) => {
    if (!user?.id) return false;
    if (team === "DESENVOLVIMENTO") return user.role === "DEVELOPER" || user.role === "ADMIN";
    return user.role === "SUPORTE" || user.role === "ADMIN";
  });
}

export function OwnerSelect({
  value,
  label,
  users,
  disabled,
  emptyLabel,
  searchPlaceholder,
  onChange,
}: {
  value: string;
  label: string;
  users: InternalUserOption[];
  disabled?: boolean;
  emptyLabel: string;
  searchPlaceholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = normalizedQuery
    ? users.filter((user) => `${user.name || ""} ${user.email} ${user.role}`.toLowerCase().includes(normalizedQuery))
    : users;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-between rounded-md border-border/70 bg-background px-3 text-left text-sm font-medium shadow-none transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          <span className="min-w-0 truncate">{label}</span>
          <UserRound className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-(--radix-popover-trigger-width) p-0">
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="pl-9" />
          </div>
        </div>
        <ScrollArea className="max-h-72">
          <div className="p-1.5">
            <button
              type="button"
              className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted", !value && "bg-primary/8 text-foreground")}
              onClick={() => { onChange(""); setOpen(false); }}
            >
              <Check className={cn("h-4 w-4 shrink-0", !value ? "opacity-100 text-primary" : "opacity-0")} />
              <span>{emptyLabel}</span>
            </button>

            {filteredUsers.map((user) => {
              const isSelected = user.id === value;
              const userLabel = user.name?.trim() || user.email;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={cn("flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted", isSelected && "bg-primary/8 text-foreground")}
                  onClick={() => { onChange(user.id); setOpen(false); }}
                >
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? "opacity-100 text-primary" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block truncate">{userLabel}</span>
                    <span className="block text-xs text-muted-foreground">{user.email}</span>
                  </span>
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum usuario encontrado.</div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function SupportPeopleFields({
  ticket,
  canManageTickets,
  isPending,
  supportUsers,
  developmentUsers,
  onUpdateOwners,
}: {
  ticket: TicketDetailsItem;
  canManageTickets: boolean;
  isPending: boolean;
  supportUsers: InternalUserOption[];
  developmentUsers: InternalUserOption[];
  onUpdateOwners: (payload: { supportOwnerUserId?: string; developmentOwnerUserId?: string }) => void;
}) {
  const supportName = ticket.operations?.supportOwnerName || "Nao definido";
  const supportId = ticket.operations?.supportOwnerUserId || "";
  const developerName = ticket.operations?.developmentOwnerName || "Nao definido";
  const developerId = ticket.operations?.developmentOwnerUserId || "";

  return (
    <>
      {canManageTickets ? (
        <EditableSidebarField label="Analista responsavel">
          <OwnerSelect value={supportId} label={supportName} users={supportUsers} disabled={isPending} emptyLabel="Sem analista responsavel" searchPlaceholder="Pesquisar analista" onChange={(value) => onUpdateOwners({ supportOwnerUserId: value })} />
        </EditableSidebarField>
      ) : (
        <SidebarField label="Analista responsavel" value={<span className="flex items-center justify-end gap-1.5 text-xs">{supportId && <UserRound className="h-3 w-3 text-muted-foreground" />}{supportName}</span>} />
      )}
      {canManageTickets ? (
        <EditableSidebarField label="Desenvolvedor">
          <OwnerSelect value={developerId} label={developerName} users={developmentUsers} disabled={isPending} emptyLabel="Sem desenvolvedor" searchPlaceholder="Pesquisar desenvolvedor" onChange={(value) => onUpdateOwners({ developmentOwnerUserId: value })} />
        </EditableSidebarField>
      ) : (
        <SidebarField label="Desenvolvedor" value={<span className="flex items-center justify-end gap-1.5 text-xs">{developerId && <UserRound className="h-3 w-3 text-muted-foreground" />}{developerName}</span>} />
      )}
    </>
  );
}
