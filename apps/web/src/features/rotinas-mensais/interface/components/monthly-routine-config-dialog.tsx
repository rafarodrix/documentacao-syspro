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
import { ClipboardList, FileText, UserRound } from "lucide-react";

interface MonthlyRoutineConfigDialogProps {
  item: MonthlyRoutineCompetencyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthlyRoutineConfigDialog({
  item,
  open,
  onOpenChange,
}: MonthlyRoutineConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Configuracao da rotina
          </DialogTitle>
          <DialogDescription>
            Visualize os dados configurados na empresa para esta competencia.
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contabilidade</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.accountingFirmName || "Nao vinculada"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contato: {item.accountingContactName || "Nao definido"}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.clientContactName || "Nao definido"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vencimento: {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Checklist padrao</h3>
                <Badge variant="outline">{item.requiredDocumentsCount} item(ns)</Badge>
              </div>

              {item.requiredDocuments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                  Nenhum item de checklist configurado para esta empresa.
                </div>
              ) : (
                <div className="space-y-2">
                  {item.requiredDocuments.map((document, index) => (
                    <div key={`${item.id}-required-document-${index}`} className="rounded-xl border border-border/60 px-4 py-3 text-sm text-foreground">
                      {document}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Observacoes da empresa</h3>
              </div>

              <div className="rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                {item.configNotes?.trim() || "Nenhuma observacao operacional configurada na empresa."}
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
