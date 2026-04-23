"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { toast } from "sonner";
import { CRM_LEAD_SOURCE_VALUES, CRM_LEAD_STAGE_VALUES } from "@dosc-syspro/contracts/crm";
import type { LeadContactOption } from "@/features/crm/domain/model";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS } from "@/features/crm/domain/model";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function CreateLeadPageForm({ contacts }: { contacts: LeadContactOption[] }) {
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredContacts = useMemo(() => {
    const term = normalizeSearch(contactSearch);
    const source = term
      ? contacts.filter((contact) =>
          normalizeSearch(
            `${contact.name} ${contact.email || ""} ${contact.phone || ""} ${contact.companies.join(" ")}`,
          ).includes(term),
        )
      : contacts;

    return source.slice(0, 50);
  }, [contacts, contactSearch]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          title: String(formData.get("title") || ""),
          stage: String(formData.get("stage") || "LEAD"),
          source: String(formData.get("source") || "MANUAL"),
          contactId: String(formData.get("contactId") || "") || null,
          contactName: String(formData.get("contactName") || "") || null,
          contactEmail: String(formData.get("contactEmail") || "") || null,
          contactPhone: String(formData.get("contactPhone") || "") || null,
          companyName: String(formData.get("companyName") || ""),
          tradeName: String(formData.get("tradeName") || "") || null,
          document: String(formData.get("document") || "") || null,
          industry: String(formData.get("industry") || "") || null,
          companySize: String(formData.get("companySize") || "") || null,
          city: String(formData.get("city") || "") || null,
          state: String(formData.get("state") || "") || null,
          estimatedValue: String(formData.get("estimatedValue") || "").trim()
            ? Number(String(formData.get("estimatedValue")).replace(",", "."))
            : null,
          expectedCloseAt: String(formData.get("expectedCloseAt") || "") || null,
          nextStep: String(formData.get("nextStep") || "") || null,
          qualificationNotes: String(formData.get("qualificationNotes") || "") || null,
          lostReason: String(formData.get("lostReason") || "") || null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        toast.error(payload?.error || payload?.message || "Falha ao criar lead.");
        return;
      }

      toast.success("Lead criado com sucesso.");
      router.push("/portal/comercial/leads");
      router.refresh();
    } catch (error) {
      console.error("Erro ao criar lead:", error);
      toast.error("Falha ao criar lead.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Novo lead</h1>
          <p className="text-sm text-muted-foreground">
            Registre a oportunidade comercial primeiro. Os detalhes complementares entram conforme a negociacao avanca.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/portal/comercial/leads">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar lead"}
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Essenciais</CardTitle>
          <CardDescription>O minimo necessario para colocar o lead no funil.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Titulo" htmlFor="lead-title" required>
            <Input id="lead-title" name="title" placeholder="Ex.: Rede avaliando migracao do ERP" required />
          </Field>

          <Field label="Empresa potencial" htmlFor="lead-company-name" required>
            <Input id="lead-company-name" name="companyName" placeholder="Nome da empresa prospect" required />
          </Field>

          <Field label="Etapa" htmlFor="lead-stage">
            <select
              id="lead-stage"
              name="stage"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CRM_LEAD_STAGE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CRM_STAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Origem" htmlFor="lead-source">
            <select
              id="lead-source"
              name="source"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CRM_LEAD_SOURCE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CRM_SOURCE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contato vinculado" htmlFor="lead-contact-picker">
            <>
              <input type="hidden" name="contactId" value={selectedContactId} />
              <input type="hidden" name="contactName" value={selectedContact?.name || ""} />
              <input type="hidden" name="contactEmail" value={selectedContact?.email || ""} />
              <input
                type="hidden"
                name="contactPhone"
                value={selectedContact?.whatsapp || selectedContact?.phone || ""}
              />
              <ContactPicker
                contacts={filteredContacts}
                selectedContact={selectedContact}
                search={contactSearch}
                onSearchChange={setContactSearch}
                onSelect={(contact) => setSelectedContactId(contact?.id || "")}
              />
            </>
          </Field>

          <Field label="Proximo passo" htmlFor="lead-next-step">
            <Input id="lead-next-step" name="nextStep" placeholder="Ex.: agendar apresentacao comercial" />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="px-6">
            <AccordionItem value="commercial-context" className="border-none">
              <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">
                Detalhes complementares
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome fantasia" htmlFor="lead-trade-name">
                      <Input id="lead-trade-name" name="tradeName" placeholder="Opcional" />
                    </Field>
                    <Field label="CNPJ / documento" htmlFor="lead-document">
                      <Input id="lead-document" name="document" placeholder="Somente se ja informado" />
                    </Field>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Cidade" htmlFor="lead-city">
                      <Input id="lead-city" name="city" placeholder="Cidade do prospect" />
                    </Field>
                    <Field label="UF" htmlFor="lead-state">
                      <Input id="lead-state" name="state" placeholder="MG" maxLength={8} />
                    </Field>
                    <Field label="Segmento" htmlFor="lead-industry">
                      <Input id="lead-industry" name="industry" placeholder="Autopecas, farmacia, comercial..." />
                    </Field>
                    <Field label="Porte" htmlFor="lead-company-size">
                      <Input id="lead-company-size" name="companySize" placeholder="Ex.: 3 lojas / 25 usuarios" />
                    </Field>
                    <Field label="Valor estimado" htmlFor="lead-estimated-value">
                      <Input
                        id="lead-estimated-value"
                        name="estimatedValue"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                      />
                    </Field>
                    <Field label="Fechamento previsto" htmlFor="lead-expected-close-at">
                      <Input id="lead-expected-close-at" name="expectedCloseAt" type="date" />
                    </Field>
                  </div>

                  <Field label="Notas de qualificacao" htmlFor="lead-qualification-notes">
                    <Textarea
                      id="lead-qualification-notes"
                      name="qualificationNotes"
                      rows={6}
                      placeholder="Contexto, dores, prazo, concorrente ou observacoes da oportunidade."
                    />
                  </Field>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function ContactPicker({
  contacts,
  selectedContact,
  search,
  onSearchChange,
  onSelect,
}: {
  contacts: LeadContactOption[];
  selectedContact: LeadContactOption | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (contact: LeadContactOption | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="lead-contact-picker"
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full justify-between px-3 py-2"
        >
          <div className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-foreground">
              {selectedContact ? selectedContact.name : "Selecionar contato existente"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {selectedContact
                ? `${selectedContact.email || selectedContact.phone || "Sem canal"}`
                : "Busca por nome, email, telefone ou empresa"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[28rem] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 border-none bg-muted/20 pl-9 shadow-none"
              placeholder="Buscar contato..."
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
              onSearchChange("");
            }}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
          >
            <div>
              <span className="block text-sm font-medium text-foreground">Sem vinculo</span>
              <span className="block text-[11px] text-muted-foreground">
                Registrar lead sem contato associado
              </span>
            </div>
            {!selectedContact ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>

          {contacts.map((contact) => {
            const isSelected = selectedContact?.id === contact.id;
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => {
                  onSelect(contact);
                  setOpen(false);
                  onSearchChange("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50",
                  isSelected ? "bg-primary/5" : "",
                )}
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{contact.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {[contact.email, contact.whatsapp || contact.phone, contact.companies[0]]
                      .filter(Boolean)
                      .join(" - ")}
                  </span>
                </div>
                {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            );
          })}

          {contacts.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum contato encontrado.
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
