"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Check, Loader2 } from "lucide-react";
import type { TicketModuleSettingsOption } from "@dosc-syspro/contracts/ticket";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { transferTicketAction } from "@/features/tickets/application/ticket-actions";
import { cn } from "@/lib/utils";

interface TransferTicketPopoverProps {
  ticketId: string | number;
  currentTeam?: string;
  teams?: TicketModuleSettingsOption[];
  trigger?: ReactNode;
  onTransferred?: (team: string) => void;
}

const defaultTeamOptions = [
  { value: "SUPORTE", label: "Suporte" },
  { value: "DESENVOLVIMENTO", label: "Desenvolvimento" },
];

export function TransferTicketDialog({ ticketId, currentTeam, teams, trigger, onTransferred }: TransferTicketPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(currentTeam || "SUPORTE");
  const [handoffNote, setHandoffNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedTeamIsDevelopment = selectedTeam === "DESENVOLVIMENTO";
  const canTransferToDevelopment = !selectedTeamIsDevelopment || handoffNote.trim().length >= 20;
  const teamOptions = teams?.length ? teams : defaultTeamOptions;

  const handleTransfer = (team: string, note?: string) => {
    startTransition(async () => {
      try {
        const result = await transferTicketAction(String(ticketId), {
          team,
          note,
        });

        if (result.success) {
          toast.success("Setor atualizado.");
          onTransferred?.(team);
          setOpen(false);
          setHandoffNote("");
          router.refresh();
        } else {
          toast.error(result.error || "Falha ao mudar fila");
        }
      } catch {
        toast.error("Ocorreu um erro inesperado");
      }
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setSelectedTeam(currentTeam || "SUPORTE");
      }}
    >
      <PopoverTrigger asChild>
        {trigger || (
          <Button id="transfer-ticket-btn" size="sm" variant="outline" className="h-8 gap-1 border-primary/20 bg-primary/5 text-xs text-primary transition-colors hover:bg-primary/10">
            <ArrowRightLeft className="h-3 w-3" /> Setor
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end" sideOffset={8}>
        <div className="space-y-2">
          <div className="space-y-1">
            <h4 className="px-2 pt-1 text-sm font-medium leading-none">Trocar setor</h4>
            <p className="px-2 text-xs text-muted-foreground">Selecione o setor de destino.</p>
          </div>
          <div className="space-y-1">
            {teamOptions.map((team) => {
              const active = (currentTeam || "SUPORTE").toLowerCase() === team.value.toLowerCase();
              const selected = selectedTeam.toLowerCase() === team.value.toLowerCase();
              return (
                <button
                  key={team.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                    (active || selected) && "bg-muted font-medium",
                  )}
                  onClick={() => {
                    setSelectedTeam(team.value);
                    if (team.value !== "DESENVOLVIMENTO" && !active) handleTransfer(team.value);
                  }}
                  disabled={isPending || active}
                >
                  <span>{team.label}</span>
                  {isPending && !active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              );
            })}
          </div>
          {selectedTeamIsDevelopment && (currentTeam || "SUPORTE").toLowerCase() !== "desenvolvimento" && (
            <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
              <label htmlFor="ticket-handoff-note" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contexto para o dev
              </label>
              <Textarea
                id="ticket-handoff-note"
                value={handoffNote}
                onChange={(event) => setHandoffNote(event.target.value)}
                placeholder="O que ja foi tentado? Qual o comportamento esperado vs atual? Versao afetada?"
                rows={4}
                className="resize-none text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Minimo 20 caracteres para transferencia ao desenvolvimento.
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 w-full text-xs"
                disabled={isPending || !canTransferToDevelopment}
                onClick={() => handleTransfer("DESENVOLVIMENTO", handoffNote)}
              >
                {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Transferir para desenvolvimento
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
