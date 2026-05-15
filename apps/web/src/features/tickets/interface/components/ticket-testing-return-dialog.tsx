"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TicketModulePriority, TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Textarea } from "@dosc-syspro/ui";
import { trpc } from "@/lib/api/trpc-client";
import type { TicketDetailsItem } from "./ticket-view.types";

interface TicketTestingReturnDialogProps {
  ticket: TicketDetailsItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: {
    team?: string;
    module?: string;
    category?: string;
    priority?: TicketModulePriority;
    status: TicketModuleStatus;
  };
  successMessage: string;
}

export function TicketTestingReturnDialog({
  ticket,
  open,
  onOpenChange,
  payload,
  successMessage,
}: TicketTestingReturnDialogProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setNote("");
    }
  }, [open]);

  const handleConfirm = () => {
    const normalizedNote = note.trim();
    if (normalizedNote.length < 20) {
      toast.error("Informe o motivo do retorno dos testes com no minimo 20 caracteres.");
      return;
    }

    startTransition(async () => {
      const result = await trpc.tickets.update.mutate({
        id: String(ticket.id),
        data: {
          ...payload,
          note: normalizedNote,
        },
      });

      if (!result.success) {
        toast.error(result.error || "Erro ao retornar ticket para andamento.");
        return;
      }

      toast.success(successMessage);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <MessageSquareWarning className="h-5 w-5" />
            Retorno dos testes
          </DialogTitle>
          <DialogDescription>
            Explique o que foi validado, o motivo do retorno e o que precisa voltar para programacao.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo do retorno *
            </Label>
            <Textarea
              rows={6}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Descreva o erro encontrado, o que ja foi testado, o comportamento esperado e o ajuste necessario."
              className="resize-none text-xs"
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Essa mensagem sera registrada como nota interna na conversa e usada no disparo da automacao de WhatsApp.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || note.trim().length < 20} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Retornar para andamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
