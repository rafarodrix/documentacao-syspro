"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/api/trpc-client";
import type { TaskItem, TaskStatus } from "@dosc-syspro/contracts/tarefas";
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
import { CalendarClock, ClipboardList, FileText, History, Loader2, MessageSquareShare } from "lucide-react";

interface TaskDetailsDialogProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TaskDetailsSection = "resumo" | "andamento" | "configuracao" | "historico";

function getStatusLabel(status: TaskStatus) {
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

function getStatusVariant(status: TaskStatus) {
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

function getRequestStatusLabel(status: TaskItem["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "Enviado";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

export function TaskDetailsDialog({
  itemId,
  open,
  onOpenChange,
}: TaskDetailsDialogProps) {
  const [section, setSection] = useState<TaskDetailsSection>("resumo");
  const [item, setItem] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !itemId) {
      setItem(null);
      return;
    }
    setSection("resumo");
    setLoading(true);
    trpc.tarefas.getTask
      .query({ id: itemId })
      .then((result: TaskItem) => setItem(result))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [open, itemId]);

  const sectionButtonClass = (value: TaskDetailsSection) =>
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
      section === value
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:max-w-6xl p-0 flex flex-col max-h-[90vh] h-[85vh] overflow-hidden gap-0 shadow-2xl border-primary/20">
        <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
          <DialogHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                  <CalendarClock className="h-5 w-5" />
                </div>
                Detalhes da tarefa
              </DialogTitle>

              {item ? <Badge variant={getStatusVariant(item.status)}>{getStatusLabel(item.status)}</Badge> : null}
            </div>
            <DialogDescription>
              Visualize o andamento operacional, checklist e configuracao projetada da empresa.
            </DialogDescription>
            {item ? (
              <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                <span className="font-medium text-foreground">{item.companyName}</span>
                <span className="hidden sm:inline">•</span>
                <span>
                  {item.title}
                  {item.year && item.month ? ` - ${String(item.month).padStart(2, "0")}/${item.year}` : ""}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>Vencimento {new Date(item.dueDate).toLocaleDateString("pt-BR")}</span>
              </div>
            ) : null}
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : item ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="border-b border-border/40 bg-muted/5 p-4 lg:border-b-0 lg:border-r lg:overflow-y-auto">
              <div className="space-y-1 px-1 pb-4">
                <div className="text-sm font-semibold text-foreground">{item.companyName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.title}
                  {item.year && item.month ? ` - ${String(item.month).padStart(2, "0")}/${item.year}` : ""}
                </div>
              </div>

              <div className="space-y-2">
                <button type="button" className={sectionButtonClass("resumo")} onClick={() => setSection("resumo")}>
                  <FileText className="h-4 w-4" />
                  <span className="flex-1">Resumo</span>
                </button>
                <button type="button" className={sectionButtonClass("andamento")} onClick={() => setSection("andamento")}>
                  <MessageSquareShare className="h-4 w-4" />
                  <span className="flex-1">Andamento</span>
                </button>
                <button type="button" className={sectionButtonClass("configuracao")} onClick={() => setSection("configuracao")}>
                  <ClipboardList className="h-4 w-4" />
                  <span className="flex-1">Configuracao</span>
                </button>
                <button type="button" className={sectionButtonClass("historico")} onClick={() => setSection("historico")}>
                  <History className="h-4 w-4" />
                  <span className="flex-1">Historico</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-6">
              {section === "resumo" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.companyName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.title}
                          {item.year && item.month ? ` - Competencia ${String(item.month).padStart(2, "0")}/${item.year}` : ""}
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

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">Observacao operacional</h3>
                    <div className="rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                      {item.notes?.trim() || "Nenhuma observacao operacional registrada."}
                    </div>
                  </div>
                </div>
              ) : null}

              {section === "andamento" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareShare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Solicitacoes manuais</h3>
                  </div>

                  {item.manualRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                      Nenhum disparo manual registrado para esta tarefa.
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
              ) : null}

              {section === "configuracao" ? (
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
                </div>
              ) : null}

              {section === "historico" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Historico operacional</h3>
                  </div>

                  {item.history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                      Nenhum evento registrado para esta tarefa.
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
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="shrink-0 border-t border-border/40 bg-muted/5 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
