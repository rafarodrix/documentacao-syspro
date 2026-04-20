"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transferTicketAction } from "@/features/tickets/application/ticket-actions";
import type { TicketModuleStatus } from "@dosc-syspro/contracts/ticket";

interface TransferTicketPopoverProps {
  ticketId: string | number;
  currentTeam?: string;
  currentStatus?: string;
}

function normalizeStatusForSelect(status?: string): TicketModuleStatus {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "new" || normalized === "novo") return "TRIAGE";
  if (normalized === "triage" || normalized === "triagem") return "TRIAGE";
  if (normalized === "testing" || normalized === "em teste") return "TESTING";
  if (normalized === "waiting_customer" || normalized === "pendente cliente") return "WAITING_CUSTOMER";
  if (normalized === "resolved" || normalized === "resolvido") return "RESOLVED";
  return "IN_PROGRESS";
}

export function TransferTicketDialog({ ticketId, currentTeam, currentStatus }: TransferTicketPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [team, setTeam] = useState<string>(currentTeam || "SUPORTE");
  const [status, setStatus] = useState<TicketModuleStatus>(normalizeStatusForSelect(currentStatus));

  const handleTransfer = () => {
    startTransition(async () => {
      try {
        const result = await transferTicketAction(String(ticketId), {
          team,
          status,
        });

        if (result.success) {
          toast.success("Fila atualizada instataneamente.");
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
      <PopoverContent className="w-80 p-4" align="end" sideOffset={8}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm leading-none">Trocar Fila</h4>
            <p className="text-xs text-muted-foreground">Transfira o chamado de setor rapidamente.</p>
          </div>
          
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label htmlFor="team" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fila de Destino</label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger id="team" className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPORTE" className="text-xs">Suporte</SelectItem>
                  <SelectItem value="DESENVOLVIMENTO" className="text-xs">Desenvolvimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-1">
              <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Atualizado</label>
              <Select value={status} onValueChange={(value) => setStatus(value as TicketModuleStatus)}>
                <SelectTrigger id="status" className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAGE" className="text-xs">Triagem</SelectItem>
                  <SelectItem value="IN_PROGRESS" className="text-xs">Em andamento</SelectItem>
                  <SelectItem value="TESTING" className="text-xs">Em teste</SelectItem>
                  <SelectItem value="WAITING_CUSTOMER" className="text-xs">Pendente cliente</SelectItem>
                  <SelectItem value="RESOLVED" className="text-xs">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={handleTransfer} disabled={isPending} className="w-full mt-2 h-8 text-xs">
              {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Aplicar Mudanca
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
