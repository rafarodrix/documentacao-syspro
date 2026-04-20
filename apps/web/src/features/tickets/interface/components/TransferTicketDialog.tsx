"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { transferTicketAction } from "@/features/tickets/application/ticket-actions";
import { cn } from "@/lib/utils";

interface TransferTicketPopoverProps {
  ticketId: string | number;
  currentTeam?: string;
}

const teamOptions = [
  { value: "SUPORTE", label: "Suporte" },
  { value: "DESENVOLVIMENTO", label: "Desenvolvimento" },
];

export function TransferTicketDialog({ ticketId, currentTeam }: TransferTicketPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTransfer = (team: string) => {
    startTransition(async () => {
      try {
        const result = await transferTicketAction(String(ticketId), {
          team,
        });

        if (result.success) {
          toast.success("Fila atualizada.");
          setOpen(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id="transfer-ticket-btn" size="sm" variant="outline" className="h-8 gap-1 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors text-xs">
          <ArrowRightLeft className="h-3 w-3" /> Fila
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" sideOffset={8}>
        <div className="space-y-2">
          <div className="space-y-1">
            <h4 className="px-2 pt-1 text-sm font-medium leading-none">Trocar fila</h4>
            <p className="px-2 text-xs text-muted-foreground">Selecione o setor de destino.</p>
          </div>
          <div className="space-y-1">
            {teamOptions.map((team) => {
              const active = (currentTeam || "SUPORTE") === team.value;
              return (
                <button
                  key={team.value}
                  type="button"
                  className={cn("flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted", active && "bg-muted font-medium")}
                  onClick={() => handleTransfer(team.value)}
                  disabled={isPending || active}
                >
                  <span>{team.label}</span>
                  {isPending && !active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
