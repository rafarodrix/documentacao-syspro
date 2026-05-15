"use client";

import type { MonthlyRoutineCompetencyItem } from "@dosc-syspro/contracts/rotinas-mensais";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dosc-syspro/ui";
import { CalendarClock, ClipboardList, History, MessageSquareShare } from "lucide-react";

interface MonthlyRoutineDetailsDialogProps {
  item: MonthlyRoutineCompetencyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusLabel(status: MonthlyRoutineCompetencyItem["status"]) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "WAITING_CUSTOMER":
      return "Aguardando cliente";
    case "RECEIVED":
      return "Recebido";
    case "SENT_TO_ACCOUNTING":
      return "Enviado para contabilidade";
    case "COMPLETED":
      return "Concluido";
    case "OVERDUE":
      return "Atrasado";
    case "CANCELED":
      return "Cancelado";
    default:
      return status;
  }
}

function getStatusVariant(status: MonthlyRoutineCompetencyItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "OVERDUE":
      return "destructive" as const;
    case "SENT_TO_ACCOUNTING":
      return "info" as const;
    case "RECEIVED":
      return "warning" as const;
    case "WAITING_CUSTOMER":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function getRequestStatusLabel(status: MonthlyRoutineCompetencyItem["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "Enviado";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

export function MonthlyRoutineDetailsDialog({
  item,
  open,
  onOpenChange,
}: MonthlyRoutineDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Detalhes da competencia
          </DialogTitle>
          <DialogDescription>
            Visualize o andamento operacional, historico, checklist e configuracao projetada da empresa.
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.companyName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.title} - Competencia {String(item.month).padStart(2, "0")}/{item.year}
                  </div>
                </div>
                <Badge variant={getStatusVariant(item.status)}>{getStatusLabel(item.status)}</Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contabilidade</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.accountingFirmName || "Nao vinculada"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Contato: {item.accountingContactName || "Nao definido"}</p>
              </div>
              <div className="rounded-xl border border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.clientContactName || "Nao definido"}</p>
              </div>
              <div className="rounded-xl border border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vencimento</p>
                <p className="mt-1 text-sm font-medium text-foreground">{new Date(item.dueDate).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="rounded-xl border border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Solicitacoes</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.manualRequestsCount} envio(s)</p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Historico operacional</h3>
                  </div>

                  {item.history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                      Nenhum evento registrado para esta competencia.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.history.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-border/60 px-4 py-3">
                          <div className="text-sm font-medium text-foreground">{entry.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.authorUserName ? `${entry.authorUserName} - ` : ""}
                            {new Date(entry.occurredAt).toLocaleString("pt-BR")}
                          </div>
                          {entry.description ? (
                            <p className="mt-2 text-xs text-muted-foreground">{entry.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareShare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Solicitacoes manuais</h3>
                  </div>

                  {item.manualRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                      Nenhum disparo manual registrado para esta competencia.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.manualRequests.map((request) => (
                        <div key={request.id} className="rounded-xl border border-border/60 px-4 py-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                Envio #{request.attemptNumber} - {request.contactName}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {request.requestedByUserName} - {new Date(request.requestedAt).toLocaleString("pt-BR")}
                              </div>
                            </div>
                            <Badge variant={request.status === "SENT" ? "success" : "destructive"}>
                              {getRequestStatusLabel(request.status)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{request.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Checklist da empresa</h3>
                  </div>

                  {item.requiredDocuments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                      Nenhum item de checklist configurado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.requiredDocuments.map((document, index) => (
                        <div key={`${item.id}-document-${index}`} className="rounded-xl border border-border/60 px-4 py-3 text-sm text-foreground">
                          {document}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Observacoes da empresa</h3>
                  <div className="rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                    {item.configNotes?.trim() || "Nenhuma observacao configurada na empresa."}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Observacao operacional da competencia</h3>
                  <div className="rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                    {item.notes?.trim() || "Nenhuma observacao operacional registrada."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
