"use client";

import { Badge, Button, Input, Label, Textarea } from "@dosc-syspro/ui";
import { Mail, PencilLine, Phone, PlayCircle, PlusCircle, Trash2, X } from "lucide-react";
import type { CrmLead, CrmLeadManualContact } from "@dosc-syspro/contracts/crm";
import { EMPTY_CONTACT } from "../../lead-management.types";

type Props = {
  leadDetails: CrmLead;
  editingContactIndex: number | null;
  editingContact: CrmLeadManualContact | null;
  setEditingContactIndex: (idx: number | null) => void;
  setEditingContact: (c: CrmLeadManualContact | null) => void;
  onSaveContact: () => void;
  onRemoveContact: (index: number) => void;
};

export function SheetContatosTab({
  leadDetails,
  editingContactIndex,
  editingContact,
  setEditingContactIndex,
  setEditingContact,
  onSaveContact,
  onRemoveContact,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Contatos do Lead</p>
          <p className="text-xs text-muted-foreground">Registre sócios, decisores ou usuários-chave.</p>
        </div>
        {editingContactIndex === null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setEditingContactIndex(leadDetails.contacts.length); setEditingContact({ ...EMPTY_CONTACT }); }}
            className="h-8 gap-1.5 text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Adicionar
          </Button>
        )}
      </div>

      {editingContactIndex !== null && editingContact ? (
        <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <p className="text-xs font-bold uppercase text-foreground">
              {editingContactIndex < leadDetails.contacts.length ? "Editar Contato" : "Novo Contato"}
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setEditingContactIndex(null); setEditingContact(null); }} className="h-7 w-7 p-0 rounded-full">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Nome *</Label>
              <Input value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Cargo / Papel</Label>
              <Input value={editingContact.role || ""} onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })} placeholder="Ex.: Sócio, Diretor, TI" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">E-mail</Label>
              <Input value={editingContact.email || ""} onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Telefone</Label>
              <Input value={editingContact.phone || ""} onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })} placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">WhatsApp</Label>
              <Input value={editingContact.whatsapp || ""} onChange={(e) => setEditingContact({ ...editingContact, whatsapp: e.target.value })} placeholder="+55 (00) 00000-0000" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-[11px] font-semibold">Observações / Histórico de Contatos Efetuados</Label>
              <Textarea value={editingContact.notes || ""} onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })} placeholder="Anote detalhes de conversas efetuadas, preferências do contato ou informações gerais." rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => { setEditingContactIndex(null); setEditingContact(null); }} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button type="button" onClick={onSaveContact} className="h-8 text-xs">
              Salvar Contato
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {leadDetails.contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
            Nenhum contato manual cadastrado para este lead.
          </div>
        ) : (
          leadDetails.contacts.map((contact, idx) => (
            <div key={idx} className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/5 hover:bg-muted/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{contact.name}</p>
                    {contact.isPrimary && (
                      <Badge variant="secondary" className="text-[10px] scale-90 py-0 px-1.5 rounded-full">Principal</Badge>
                    )}
                  </div>
                  {contact.role && <p className="text-xs text-muted-foreground mt-0.5">{contact.role}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingContactIndex(idx); setEditingContact({ ...contact }); }} className="h-7 w-7 p-0 rounded-full">
                    <PencilLine className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveContact(idx)} className="h-7 w-7 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                {contact.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" /><span>{contact.phone}</span>
                  </div>
                )}
                {contact.whatsapp && (
                  <div className="flex items-center gap-1.5">
                    <PlayCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp: {contact.whatsapp}</span>
                  </div>
                )}
              </div>

              {contact.notes && (
                <div className="rounded-lg bg-muted/20 p-2.5 text-xs border border-border/60">
                  <p className="font-semibold text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Histórico / Obs:</p>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
