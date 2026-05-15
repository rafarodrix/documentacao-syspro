"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { trpc } from "@/lib/api/trpc-client";
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@dosc-syspro/ui";
import { MessageSquareShare } from "lucide-react";
import { toast } from "sonner";

interface MonthlyRoutineManualRequestDialogProps {
  item: MonthlyRoutineCompetencyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
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

function getRequestStatusVariant(status: MonthlyRoutineCompetencyItem["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "success" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function buildDefaultMessage(item: MonthlyRoutineCompetencyItem, contactName: string) {
  const firstName = String(contactName || "").trim().split(/\s+/)[0] || "Tudo bem";
  const competence = `${String(item.month).padStart(2, "0")}/${item.year}`;
  return `Ola, ${firstName}. Podemos gerar os arquivos da competencia ${competence} da empresa ${item.companyName} (${item.title})? Se estiver tudo certo, por favor nos confirme por aqui.`;
}

export function MonthlyRoutineManualRequestDialog({
  item,
  open,
  onOpenChange,
  onSent,
}: MonthlyRoutineManualRequestDialogProps) {
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [contactId, setContactId] = useState("");
  const [message, setMessage] = useState("");

  const availableContacts = item?.availableContacts ?? [];

  const initialContactId = useMemo(() => {
    if (!item) return "";
    return (
      item.clientContactId ||
      availableContacts.find((contact) => Boolean(contact.whatsapp || contact.phone))?.id ||
      availableContacts[0]?.id ||
      ""
    );
  }, [availableContacts, item]);

  const selectedContact = availableContacts.find((contact) => contact.id === contactId) ?? null;

  useEffect(() => {
    if (!open || !item) return;
    const nextContactId = initialContactId;
    setContactId(nextContactId);
    const nextContact = availableContacts.find((contact) => contact.id === nextContactId) ?? availableContacts[0] ?? null;
    setMessage(nextContact ? buildDefaultMessage(item, nextContact.name) : "");
  }, [availableContacts, initialContactId, item, open]);

  const handleContactChange = (nextContactId: string) => {
    setContactId(nextContactId);
    if (!item) return;
    const nextContact = availableContacts.find((contact) => contact.id === nextContactId);
    if (nextContact) {
      setMessage(buildDefaultMessage(item, nextContact.name));
    }
  };

  const handleSubmit = () => {
    if (!item) return;
    if (!contactId) {
      toast.error("Selecione um contato para enviar a solicitacao.");
      return;
    }
    if (!message.trim()) {
      toast.error("Informe a mensagem que sera enviada ao contato.");
      return;
    }

    startSubmitTransition(async () => {
      try {
        await trpc.rotinasMensais.sendManualRequest.mutate({
          competencyId: item.id,
          contactId,
          message: message.trim(),
        });
        toast.success("Solicitacao manual enviada e registrada.");
        onOpenChange(false);
        onSent();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar a solicitacao manual.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareShare className="h-4 w-4 text-primary" />
            Disparo manual para contato
          </DialogTitle>
          <DialogDescription>
            Registra a solicitacao na competencia e envia a mensagem manualmente para um contato associado a empresa.
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
              <Label htmlFor="monthly-routine-contact">Contato</Label>
              <Select value={contactId} onValueChange={handleContactChange} disabled={availableContacts.length === 0}>
                <SelectTrigger id="monthly-routine-contact">
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {availableContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedContact ? (
                <p className="text-xs text-muted-foreground">
                  Destino: {selectedContact.whatsapp || selectedContact.phone || "Sem telefone cadastrado"}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-routine-message">Mensagem</Label>
              <Textarea
                id="monthly-routine-message"
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Escreva a mensagem que sera enviada para o contato."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Historico recente</h3>
                <span className="text-xs text-muted-foreground">{item.manualRequestsCount} registro(s)</span>
              </div>

              {item.manualRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                  Nenhuma solicitacao manual registrada para esta competencia.
                </div>
              ) : (
                <div className="space-y-2">
                  {item.manualRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-border/60 px-4 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">{request.contactName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(request.requestedAt).toLocaleString("pt-BR")} - {request.requestedByUserName}
                          </div>
                        </div>
                        <Badge variant={getRequestStatusVariant(request.status)}>
                          {getRequestStatusLabel(request.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{request.message}</p>
                      {request.errorMessage ? (
                        <p className="mt-2 text-xs text-destructive">{request.errorMessage}</p>
                      ) : null}
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
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedContact || !Boolean(selectedContact.whatsapp || selectedContact.phone)}
          >
            {isSubmitting ? "Enviando..." : "Enviar solicitacao"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
