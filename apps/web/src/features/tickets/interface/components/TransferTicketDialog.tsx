"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { transferTicketAction } from "@/features/tickets/application/ticket-actions";

interface TransferTicketDialogProps {
  ticketId: string | number;
  currentTeam?: string;
  currentStatus?: string;
}

export function TransferTicketDialog({ ticketId, currentTeam, currentStatus }: TransferTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [team, setTeam] = useState<string>(currentTeam || "SUPORTE");
  const [status, setStatus] = useState<string>(currentStatus === "NEW" ? "TRIAGE" : currentStatus || "IN_PROGRESS");
  const [note, setNote] = useState("");

  const handleTransfer = () => {
    startTransition(async () => {
      try {
        const result = await transferTicketAction(String(ticketId), {
          team,
          status,
          note,
        });

        if (result.success) {
          toast.success("Chamado transferido com sucesso");
          setOpen(false);
          setNote("");
          router.refresh();
        } else {
          toast.error(result.error || "Falha ao transferir chamado");
        }
      } catch {
        toast.error("Ocorreu um erro inesperado");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors text-xs">
          <ArrowRightLeft className="h-3 w-3" /> Fila
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mudar Fila (Transferir)</DialogTitle>
          <DialogDescription>
            Transfira este chamado para outro setor e atualize o status.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="team">Setor / Fila</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPORTE">Suporte</SelectItem>
                <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                <SelectItem value="TESTES">Testes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Novo Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                <SelectItem value="TESTING">Em teste</SelectItem>
                <SelectItem value="WAITING_CUSTOMER">Pendente cliente</SelectItem>
                <SelectItem value="RESOLVED">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Nota de transferencia (Opcional)</Label>
            <Textarea
              id="note"
              placeholder="Explique o motivo da transferencia..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none h-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
