"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { CompanyContactSource, CompanyContactStatus } from "@prisma/client";
import type { CreateCompanyInput } from "@dosc-syspro/contracts/company";
import type { CompanyContactInput, CompanyTicketEmailInput } from "@/features/company/domain/model";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  BadgeHelp,
  Mail,
  Phone,
  Plus,
  Trash2,
  Users,
  Star,
  Archive,
  RotateCcw,
  TicketCheck,
  UserPlus,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  notes: string;
  source: CompanyContactSource;
  status: CompanyContactStatus;
};

type TicketEmailDraft = {
  email: string;
  label: string;
};

const CONTACT_STATUS_BADGE: Record<CompanyContactStatus, string> = {
  PENDING_LINK: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  LINKED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ARCHIVED: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};
const CONTACT_STATUS_LABEL: Record<CompanyContactStatus, string> = {
  PENDING_LINK: "Pendente de vinculo",
  LINKED: "Vinculado",
  ARCHIVED: "Arquivado",
};
const CONTACT_SOURCE_LABEL: Record<CompanyContactSource, string> = {
  MANUAL: "Manual",
  WHATSAPP: "WhatsApp",
  IMPORT: "Importado",
};

const EMPTY_CONTACT_DRAFT: ContactDraft = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  notes: "",
  source: CompanyContactSource.MANUAL,
  status: CompanyContactStatus.LINKED,
};

const EMPTY_TICKET_DRAFT: TicketEmailDraft = { email: "", label: "" };

interface CompanyContactTabProps {
  contacts: CompanyContactInput[];
  ticketEmails: CompanyTicketEmailInput[];
  onContactsChange: (contacts: CompanyContactInput[]) => void;
  onTicketEmailsChange: (emails: CompanyTicketEmailInput[]) => void;
}

export function CompanyContactTab({
  contacts,
  ticketEmails,
  onContactsChange,
  onTicketEmailsChange,
}: CompanyContactTabProps) {
  const form = useFormContext<CreateCompanyInput>();
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [ticketDraft, setTicketDraft] = useState<TicketEmailDraft>(EMPTY_TICKET_DRAFT);

  function handleAddContact() {
    const next = {
      name: contactDraft.name.trim(),
      email: contactDraft.email.trim().toLowerCase(),
      phone: contactDraft.phone.trim(),
      whatsapp: contactDraft.whatsapp.trim(),
      notes: contactDraft.notes.trim(),
      isPrimary: contacts.length === 0,
      source: contactDraft.source,
      status: contactDraft.status,
    };
    if (!next.name) { toast.error("Informe o nome do contato."); return; }
    if (!next.email && !next.phone && !next.whatsapp) {
      toast.error("Informe ao menos um canal de contato.");
      return;
    }
    onContactsChange([...contacts, next]);
    setContactDraft(EMPTY_CONTACT_DRAFT);
    setContactDialogOpen(false);
    toast.success("Contato adicionado com sucesso.");
  }

  function handleAddTicketEmail() {
    const email = ticketDraft.email.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("E-mail invalido."); return; }
    if (ticketEmails.some((t) => t.email === email)) { toast.error("Este e-mail ja foi adicionado."); return; }
    onTicketEmailsChange([...ticketEmails, { email, label: ticketDraft.label.trim() || undefined, isActive: true }]);
    setTicketDraft(EMPTY_TICKET_DRAFT);
    setTicketDialogOpen(false);
  }

  const linkedCount = contacts.filter((c) => c.status === CompanyContactStatus.LINKED).length;
  const pendingCount = contacts.filter((c) => c.status === CompanyContactStatus.PENDING_LINK).length;

  return (
    <div className="space-y-6">
      {/* Canais de comunicacao diretos */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Canais de comunicacao</p>
            <p className="text-xs text-muted-foreground">E-mails e telefones gerais da empresa.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="emailContato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail Comercial</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="comercial@empresa.com.br" {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emailFinanceiro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail Financeiro</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="financeiro@empresa.com.br" {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={toInputValue(field.value)}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={toInputValue(field.value)}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://empresa.com.br" {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observacoes internas</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Anotacoes internas sobre a empresa..." {...field} value={toInputValue(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Central de contatos operacionais */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Contatos operacionais</p>
              <p className="text-xs text-muted-foreground">
                Pessoas vinculadas a empresa. Podem ser promovidas a usuario da plataforma futuramente.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => { setContactDraft(EMPTY_CONTACT_DRAFT); setContactDialogOpen(true); }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo contato
          </Button>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Vinculados", value: linkedCount, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pendentes", value: pendingCount, color: "text-amber-600 dark:text-amber-400" },
            {
              label: "WhatsApp",
              value: contacts.filter((c) => c.source === CompanyContactSource.WHATSAPP).length,
              color: "text-foreground",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-center">
              <p className={cn("text-xl font-bold tabular-nums", stat.color)}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <BadgeHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p>
            <strong className="text-foreground">User</strong> e autenticavel na plataforma.{" "}
            <strong className="text-foreground">Contato</strong> e identidade operacional (atendimento, conversa). Contatos podem ser promovidos a usuario quando necessario.
          </p>
        </div>

        {contacts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 py-8 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
            <Users className="h-7 w-7 opacity-40" />
            <p className="text-sm font-medium text-foreground">Nenhum contato cadastrado</p>
            <p className="text-xs">Clique em &quot;Novo contato&quot; para adicionar o primeiro contato operacional.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact, index) => (
              <div
                key={`${contact.name}-${contact.email}-${index}`}
                className="group rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 transition-all hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{contact.name}</span>
                      {index === 0 && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
                          <Star className="h-2.5 w-2.5 mr-1" />
                          Principal
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn("text-[10px]", contact.status ? CONTACT_STATUS_BADGE[contact.status] : "")}>
                        {contact.status ? CONTACT_STATUS_LABEL[contact.status] : "—"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {contact.source ? CONTACT_SOURCE_LABEL[contact.source] : "Manual"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.whatsapp && <span>{contact.whatsapp}</span>}
                    </div>
                    {contact.notes && <p className="text-xs text-muted-foreground italic">{contact.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index !== 0 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Tornar principal"
                        onClick={() =>
                          onContactsChange((prev => {
                            const next = [...prev];
                            const [sel] = next.splice(index, 1);
                            return [sel, ...next.map((c, i) => ({ ...c, isPrimary: i === 0 }))];
                          })(contacts))
                        }
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={contact.status === CompanyContactStatus.ARCHIVED ? "Reativar" : "Arquivar"}
                      onClick={() =>
                        onContactsChange(
                          contacts.map((c, i) =>
                            i === index
                              ? {
                                  ...c,
                                  status:
                                    c.status === CompanyContactStatus.ARCHIVED
                                      ? CompanyContactStatus.LINKED
                                      : CompanyContactStatus.ARCHIVED,
                                }
                              : c,
                          ),
                        )
                      }
                    >
                      {contact.status === CompanyContactStatus.ARCHIVED ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remover"
                      onClick={() => onContactsChange(contacts.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* E-mails de tickets */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <TicketCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">E-mails de tickets</p>
              <p className="text-xs text-muted-foreground">
                Caixas da empresa que geram tickets automaticamente (suporte@, fiscal@...).
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => { setTicketDraft(EMPTY_TICKET_DRAFT); setTicketDialogOpen(true); }}
          >
            <Mail className="h-3.5 w-3.5" />
            Adicionar e-mail
          </Button>
        </div>

        {ticketEmails.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 py-6 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
            <Mail className="h-6 w-6 opacity-40" />
            <p className="text-xs">Nenhum e-mail de ticket configurado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ticketEmails.map((item) => (
              <div
                key={item.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={item.isActive ? "default" : "outline"} className="text-[10px]">
                    {item.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <span className="text-sm font-medium">{item.email}</span>
                  {item.label && <span className="text-xs text-muted-foreground">({item.label})</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      onTicketEmailsChange(
                        ticketEmails.map((t) =>
                          t.email === item.email ? { ...t, isActive: !(t.isActive ?? true) } : t,
                        ),
                      )
                    }
                  >
                    {item.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onTicketEmailsChange(ticketEmails.filter((t) => t.email !== item.email))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Novo contato */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Novo contato operacional
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do contato. Ao menos um canal (email, telefone ou WhatsApp) e obrigatorio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              placeholder="Nome do contato *"
              value={contactDraft.name}
              onChange={(e) => setContactDraft((p) => ({ ...p, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="email"
                placeholder="contato@empresa.com.br"
                value={contactDraft.email}
                onChange={(e) => setContactDraft((p) => ({ ...p, email: e.target.value }))}
              />
              <Input
                placeholder="Telefone"
                value={contactDraft.phone}
                onChange={(e) => setContactDraft((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
              />
              <Input
                placeholder="WhatsApp"
                value={contactDraft.whatsapp}
                onChange={(e) => setContactDraft((p) => ({ ...p, whatsapp: formatPhone(e.target.value) }))}
              />
              <Select
                value={contactDraft.source}
                onValueChange={(v) => setContactDraft((p) => ({ ...p, source: v as CompanyContactSource }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={CompanyContactSource.MANUAL}>Manual</SelectItem>
                  <SelectItem value={CompanyContactSource.WHATSAPP}>WhatsApp</SelectItem>
                  <SelectItem value={CompanyContactSource.IMPORT}>Importado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select
              value={contactDraft.status}
              onValueChange={(v) => setContactDraft((p) => ({ ...p, status: v as CompanyContactStatus }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={CompanyContactStatus.LINKED}>Vinculado</SelectItem>
                <SelectItem value={CompanyContactStatus.PENDING_LINK}>Pendente de vinculo</SelectItem>
                <SelectItem value={CompanyContactStatus.ARCHIVED}>Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              placeholder="Observacoes (opcional)"
              value={contactDraft.notes}
              onChange={(e) => setContactDraft((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddContact} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo email de ticket */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Adicionar e-mail de ticket
            </DialogTitle>
            <DialogDescription>
              E-mails aqui listados geram tickets automaticamente quando recebem mensagens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              type="email"
              placeholder="suporte@empresa.com.br *"
              value={ticketDraft.email}
              onChange={(e) => setTicketDraft((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              placeholder="Label (ex: Suporte, Financeiro)"
              value={ticketDraft.label}
              onChange={(e) => setTicketDraft((p) => ({ ...p, label: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTicketDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddTicketEmail} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar e-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
