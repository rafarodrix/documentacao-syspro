"use client";

import { useEffect, useState, useTransition } from "react";
import { trpc } from "@/lib/api/trpc-client";
import type { MonthlyRoutineCompetencyItem, MonthlyRoutineExecutionStatus } from "@dosc-syspro/contracts/rotinas-mensais";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@dosc-syspro/ui";
import { History, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

interface MonthlyRoutineStatusDialogProps {
  item: MonthlyRoutineCompetencyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: Array<{ value: MonthlyRoutineExecutionStatus; label: string }> = [
  { value: "PENDING", label: "Pendente" },
  { value: "WAITING_CUSTOMER", label: "Aguardando cliente" },
  { value: "RECEIVED", label: "Recebido" },
  { value: "SENT_TO_ACCOUNTING", label: "Enviado para contabilidade" },
  { value: "COMPLETED", label: "Concluido" },
  { value: "OVERDUE", label: "Atrasado" },
  { value: "CANCELED", label: "Cancelado" },
];

function getHistoryStatusLabel(status: MonthlyRoutineExecutionStatus | null) {
  if (!status) return "Sem status";
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function MonthlyRoutineStatusDialog({ item, open, onOpenChange, onSaved }: MonthlyRoutineStatusDialogProps) {
  const [isSubmitting, startTransition] = useTransition();
  const [status, setStatus] = useState<MonthlyRoutineExecutionStatus>("PENDING");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setStatus(item.status);
    setNotes(item.notes || "");
  }, [item, open]);

  const handleSubmit = () => {
    if (!item) return;

    startTransition(async () => {
      try {
        await trpc.rotinasMensais.updateCompetencyStatus.mutate({
          competencyId: item.id,
          status,
          notes: notes.trim() || undefined,
        });
        toast.success("Status da competencia atualizado.");
        onOpenChange(false);
        onSaved();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar o status da competencia.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-primary" />
            Atualizar status da competencia
          </DialogTitle>
          <DialogDescription>
            Registra a mudanca operacional e adiciona o evento ao historico da rotina mensal.
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">{item.companyName}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Competencia {String(item.month).padStart(2, "0")}/{item.year} - {item.title}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-routine-status">Novo status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as MonthlyRoutineExecutionStatus)}>
                <SelectTrigger id="monthly-routine-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-routine-status-notes">Observacoes</Label>
              <Textarea
                id="monthly-routine-status-notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Opcional. Registre um contexto operacional para esta alteracao."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Historico recente</h3>
              </div>

              {item.history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                  Nenhum evento registrado para esta competencia.
                </div>
              ) : (
                <div className="space-y-2">
                  {item.history.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border/60 px-4 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">{entry.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.occurredAt).toLocaleString("pt-BR")}
                            {entry.authorUserName ? ` - ${entry.authorUserName}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.fromStatus ? <Badge variant="outline">{getHistoryStatusLabel(entry.fromStatus)}</Badge> : null}
                          {entry.toStatus ? <Badge variant="secondary">{getHistoryStatusLabel(entry.toStatus)}</Badge> : null}
                        </div>
                      </div>
                      {entry.description ? <p className="mt-2 text-xs text-muted-foreground">{entry.description}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
