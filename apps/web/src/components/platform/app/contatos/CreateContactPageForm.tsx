"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeHelp, Building2, CheckCircle2, Loader2, Save, Search, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShineBorder } from "@/components/magicui/ShineBorder";
import { cn } from "@/lib/utils";
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
  const [companyQuery, setCompanyQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    notes: "",
    companyIds: [] as string[],
  });

  const filteredCompanies = useMemo(() => {
    const term = companyQuery.trim().toLowerCase();
    if (!term) return companies.slice(0, 20);
    return companies.filter((company) =>
      [company.nomeFantasia, company.razaoSocial].some((value) => value?.toLowerCase().includes(term))
    ).slice(0, 20);
  }, [companies, companyQuery]);
  const selectedCompanies = useMemo(
    () => form.companyIds.map((companyId) => companies.find((item) => item.id === companyId)).filter(Boolean) as CompanyOption[],
    [companies, form.companyIds],
  );
  const progressPct = Math.round(((form.name.trim() ? 1 : 0) + (form.email.trim() || form.phone.trim() || form.whatsapp.trim() ? 1 : 0) + (form.companyIds.length > 0 ? 1 : 0)) / 3 * 100);

  function toggleCompany(companyId: string) {
    setForm((prev) => ({
      ...prev,
      companyIds: prev.companyIds.includes(companyId)
        ? prev.companyIds.filter((id) => id !== companyId)
        : [...prev.companyIds, companyId],
    }));
  }

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
          companyIds: form.companyIds,
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
      <ShineBorder borderWidth={1} duration={16} shineColor={["#2dd4bf", "#60a5fa", "#a78bfa"]} />
      <div className="flex items-center justify-between gap-4 border-b border-border/50 bg-gradient-to-r from-muted/30 via-background to-muted/20 px-6 py-4">
        <div>
          <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary/70" />
            Novo Contato
          </h2>
          <p className="text-sm text-muted-foreground">Cadastre o contato base da pessoa e vincule uma ou mais empresas quando fizer sentido.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      <div className="border-b border-border/50 bg-muted/20 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do cadastro</span>
          <span className="font-medium text-foreground">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-[calc(100vh-220px)] flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Identidade</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{form.name.trim() ? "Ok" : "Pendente"}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Canais ativos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {[form.email, form.phone, form.whatsapp].filter((value) => value.trim()).length}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresas vinculadas</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{form.companyIds.length}</p>
            </div>
          </div>

          <Card className="border-border/60 bg-card/95">
            <CardHeader>
              <CardTitle className="text-base">Dados do contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <BadgeHelp className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <p>
                  O contato representa a identidade operacional da pessoa. Os vínculos com empresas podem ser adicionados agora ou depois, no mesmo padrão do cadastro de empresa.
                </p>
              </div>

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

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary/70" />
                  Empresas vinculadas
                </div>
                <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  <Building2 className="mt-0.5 h-3.5 w-3.5 text-primary/80" />
                  <p>
                    Ao vincular empresas aqui, o contato já nasce pronto para atendimento, relacionamento comercial e futura promoção para usuário quando necessário.
                  </p>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={companyQuery}
                    onChange={(event) => setCompanyQuery(event.target.value)}
                    placeholder="Buscar empresa por nome fantasia ou razao social..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCompanies.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nenhuma empresa vinculada.</span>
                  ) : (
                    selectedCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => toggleCompany(company.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1 text-xs"
                      >
                        {company.nomeFantasia || company.razaoSocial}
                        <X className="h-3 w-3" />
                      </button>
                    ))
                  )}
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/50 bg-background p-2">
                  {filteredCompanies.map((company) => {
                    const selected = form.companyIds.includes(company.id);
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => toggleCompany(company.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                          selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                      >
                        <div className="space-y-0.5">
                          <span className="block">{company.nomeFantasia || company.razaoSocial}</span>
                          {company.nomeFantasia ? (
                            <span className="block text-[11px] text-muted-foreground">{company.razaoSocial}</span>
                          ) : null}
                        </div>
                        <span className="text-[11px]">{selected ? "Selecionada" : "Selecionar"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O contato pode existir sem empresa e receber vinculos depois. O usuario, quando existir, herdara estas empresas.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-notes">Observacoes</Label>
                <Textarea
                  id="contact-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Informacoes adicionais do contato"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {form.name.trim() ? <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Nome preenchido</Badge> : null}
                {form.email.trim() ? <Badge variant="outline">Email informado</Badge> : null}
                {form.phone.trim() ? <Badge variant="outline">Telefone informado</Badge> : null}
                {form.whatsapp.trim() ? <Badge variant="outline">WhatsApp informado</Badge> : null}
                {form.companyIds.length > 0 ? <Badge variant="outline">{form.companyIds.length} empresa(s) vinculada(s)</Badge> : null}
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
