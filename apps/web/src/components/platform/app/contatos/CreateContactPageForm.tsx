"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CompanyOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
};

type Props = {
  companies: CompanyOption[];
  backHref: string;
};

export function CreateContactPageForm({ companies, backHref }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    notes: "",
    companyId: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Informe o nome do contato.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          notes: form.notes || null,
          companyId: form.companyId || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.message || "Erro ao cadastrar contato.");
        return;
      }

      toast.success("Contato cadastrado com sucesso.");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Erro na comunicacao com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-xl">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 bg-gradient-to-r from-muted/30 via-background to-muted/20 px-6 py-4">
        <div>
          <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary/70" />
            Novo Contato
          </h2>
          <p className="text-sm text-muted-foreground">Cadastre o contato base da pessoa e, quando houver, vincule sua empresa principal.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-[calc(100vh-220px)] flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <Card className="border-border/60 bg-card/95">
            <CardHeader>
              <CardTitle className="text-base">Dados do contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Nome</Label>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Telefone</Label>
                  <Input
                    id="contact-phone"
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-whatsapp">WhatsApp</Label>
                  <Input
                    id="contact-whatsapp"
                    value={form.whatsapp}
                    onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                    placeholder="5500000000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={form.companyId || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, companyId: value === "__none__" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem empresa vinculada</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nomeFantasia || company.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Contatos sem empresa continuam disponiveis para vinculacao posterior e para a integracao WhatsApp.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-notes">Observacoes</Label>
                <Textarea
                  id="contact-notes"
                  rows={5}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Informacoes adicionais do contato"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/50 px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
            Cancelar
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting || !form.name.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Cadastro
          </Button>
        </div>
      </form>
    </div>
  );
}
