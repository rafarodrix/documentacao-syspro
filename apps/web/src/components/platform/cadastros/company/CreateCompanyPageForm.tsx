"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CompanyContactSource,
  CompanyContactStatus,
  CompanySegment,
  CompanyStatus,
  IndicadorIE,
  TaxRegime,
} from "@prisma/client";
import {
  createCompanySchema,
  COMPANY_REMOTE_CONNECTION_TYPE_VALUES,
  COMPANY_SERVER_PROTOCOL_VALUES,
  COMPANY_SERVER_TYPE_VALUES,
  DEFAULT_COMPANY_INSTALLATION_DIRECTORY,
  DEFAULT_COMPANY_SERVER_HOST,
  DEFAULT_COMPANY_SERVER_PORT,
  DEFAULT_COMPANY_SERVER_PROTOCOL,
  DEFAULT_COMPANY_SERVER_TYPE,
  type CreateCompanyInput,
} from "@dosc-syspro/contracts/company";
import type {
  CompanyContactInput,
  CompanyOption,
  CompanyRemoteConnectionInput,
  CompanyZammadEmailInput,
} from "@/features/company/domain/model";
import {
  createCompanyAction,
  lookupCompanyProfileByCnpjAction,
  updateCompanyAction,
} from "@/features/company/application/actions";
import { COMPANY_SEGMENT_LABELS } from "@/features/company/domain/company-segments";
import { useAddressLookup } from "@/features/company/hooks/use-address-lookup";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BadgeHelp,
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  CheckCircle2,
  Phone as PhoneIcon,
  Sparkles,
  Save,
  Search,
  Trash2,
  Users,
} from "lucide-react";

const CONTACT_SOURCE_LABEL: Record<CompanyContactSource, string> = {
  MANUAL: "Manual",
  WHATSAPP: "WhatsApp",
  IMPORT: "Importado",
};

const CONTACT_STATUS_LABEL: Record<CompanyContactStatus, string> = {
  PENDING_LINK: "Pendente de vinculo",
  LINKED: "Vinculado",
  ARCHIVED: "Arquivado",
};

const CONTACT_STATUS_BADGE: Record<CompanyContactStatus, string> = {
  PENDING_LINK: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  LINKED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ARCHIVED: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

const REMOTE_CONNECTION_LABEL: Record<CompanyRemoteConnectionInput["type"], string> = {
  DDNS_NOIP: "DDNS (NoIP)",
  RADMIN_VPN: "Radmin VPN",
};

interface CreateCompanyPageFormProps {
  backHref: string;
  companies: CompanyOption[];
  mode?: "create" | "edit";
  companyId?: string;
  initialData?: Partial<CreateCompanyInput>;
  initialZammadEmails?: CompanyZammadEmailInput[];
  initialContacts?: CompanyContactInput[];
  canEditCnpj?: boolean;
}

type SectionId = "geral" | "endereco" | "fiscal" | "contato" | "configuracoes";
type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  notes: string;
  source: CompanyContactSource;
  status: CompanyContactStatus;
};

const SECTIONS: Array<{ id: SectionId; title: string; description: string; icon: ElementType; fields: string[] }> = [
  {
    id: "geral",
    title: "Identificacao",
    description: "Dados cadastrais",
    icon: Building2,
    fields: ["cnpj", "segment", "status", "razaoSocial", "nomeFantasia", "logoUrl", "dataFundacao"],
  },
  {
    id: "endereco",
    title: "Endereco",
    description: "Localizacao e IBGE",
    icon: MapPin,
    fields: [
      "address.cep",
      "address.pais",
      "address.logradouro",
      "address.numero",
      "address.complemento",
      "address.bairro",
      "address.cidade",
      "address.estado",
    ],
  },
  {
    id: "contato",
    title: "Contato",
    description: "Canais de comunicacao",
    icon: PhoneIcon,
    fields: ["emailContato", "emailFinanceiro", "telefone", "whatsapp", "website", "observacoes"],
  },
  {
    id: "fiscal",
    title: "Fiscal",
    description: "Regime, inscricoes e estrutura",
    icon: FileText,
    fields: ["regimeTributario", "indicadorIE", "inscricaoEstadual", "inscricaoMunicipal", "cnae", "codSuframa", "parentCompanyId", "accountingFirmId"],
  },
  {
    id: "configuracoes",
    title: "Configuracoes",
    description: "Servidor e acesso remoto",
    icon: BadgeHelp,
    fields: [
      "serverType",
      "serverPort",
      "serverHost",
      "serverProtocol",
      "iisIsapiPath",
      "installationDirectory",
      "remoteConnections",
    ],
  },
];

function hasPath(obj: unknown, path: string): boolean {
  if (!obj || typeof obj !== "object") return false;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return !!current;
}

export function CreateCompanyPageForm({
  backHref,
  companies,
  mode = "create",
  companyId,
  initialData,
  initialZammadEmails = [],
  initialContacts = [],
  canEditCnpj = true,
}: CreateCompanyPageFormProps) {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionId>("geral");
  const normalizeZammadEmails = (items: CompanyZammadEmailInput[]) =>
    items
      .map((item) => ({
        email: item.email.trim().toLowerCase(),
        label: item.label?.trim() || undefined,
        isActive: item.isActive ?? true,
      }))
      .filter((item) => item.email.length > 0)
      .sort((a, b) => a.email.localeCompare(b.email));
  const initialNormalizedZammadEmails = useMemo(
    () => normalizeZammadEmails(Array.isArray(initialZammadEmails) ? initialZammadEmails : []),
    [initialZammadEmails],
  );
  const [zammadEmails, setZammadEmails] = useState<CompanyZammadEmailInput[]>(initialNormalizedZammadEmails);
  const [zammadEmailInput, setZammadEmailInput] = useState("");
  const [zammadEmailLabel, setZammadEmailLabel] = useState("");
  const initialNormalizedContacts = useMemo(
    () =>
      (Array.isArray(initialContacts) ? initialContacts : [])
        .map((item) => ({
          name: item.name?.trim() ?? "",
          email: item.email?.trim().toLowerCase() || "",
          phone: item.phone?.trim() || "",
          whatsapp: item.whatsapp?.trim() || "",
          notes: item.notes?.trim() || "",
          isPrimary: item.isPrimary ?? false,
          source: item.source ?? CompanyContactSource.MANUAL,
          status: item.status ?? CompanyContactStatus.LINKED,
        }))
        .filter((item) => item.name.length > 0),
    [initialContacts],
  );
  const [contacts, setContacts] = useState(initialNormalizedContacts);
  const [contactDraft, setContactDraft] = useState<ContactDraft>({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    notes: "",
    source: CompanyContactSource.MANUAL,
    status: CompanyContactStatus.LINKED,
  });
  const [isImportingCnpj, setIsImportingCnpj] = useState(false);
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");
  const toSelectValue = (value: unknown) => (typeof value === "string" ? value : "__none__");

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema, undefined, { raw: true }),
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      segment: undefined,
      logoUrl: "",
      status: CompanyStatus.ACTIVE,
      serverType: DEFAULT_COMPANY_SERVER_TYPE,
      serverPort: DEFAULT_COMPANY_SERVER_PORT,
      serverHost: DEFAULT_COMPANY_SERVER_HOST,
      serverProtocol: DEFAULT_COMPANY_SERVER_PROTOCOL,
      iisIsapiPath: "SYSPROSERVERISAPI.DLL",
      installationDirectory: DEFAULT_COMPANY_INSTALLATION_DIRECTORY,
      remoteConnections: [],
      indicadorIE: IndicadorIE.NAO_CONTRIBUINTE,
      regimeTributario: undefined,
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      cnae: "",
      codSuframa: "",
      parentCompanyId: "",
      accountingFirmId: "",
      emailContato: "",
      emailFinanceiro: "",
      telefone: "",
      whatsapp: "",
      website: "",
      observacoes: "",
      address: {
        description: "Sede",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        pais: "BR",
        codigoIbgeCidade: "",
        codigoIbgeEstado: "",
      },
      ...(initialData ?? {}),
    },
    mode: "onTouched",
  });

  const { errors, dirtyFields, isSubmitting, isDirty } = form.formState;
  const remoteConnectionsFieldArray = useFieldArray({
    control: form.control,
    name: "remoteConnections",
  });
  const { isLoadingCep, handleCepChange } = useAddressLookup(form.setValue);
  const zammadEmailsDirty =
    JSON.stringify(normalizeZammadEmails(zammadEmails)) !== JSON.stringify(initialNormalizedZammadEmails);
  const contactsDirty = JSON.stringify(contacts) !== JSON.stringify(initialNormalizedContacts);
  const canSubmit = isDirty || zammadEmailsDirty || contactsDirty;
  const currentCnpj = form.watch("cnpj");
  const currentServerType = form.watch("serverType");
  const linkedContactsCount = contacts.filter((contact) => contact.status === CompanyContactStatus.LINKED).length;
  const pendingContactsCount = contacts.filter((contact) => contact.status === CompanyContactStatus.PENDING_LINK).length;
  const whatsappContactsCount = contacts.filter((contact) => contact.source === CompanyContactSource.WHATSAPP).length;
  const remoteConnections = form.watch("remoteConnections") ?? [];

  function openCnpjLookup() {
    const cnpj = typeof currentCnpj === "string" ? currentCnpj : "";
    const query = cnpj ? `?cnpj=${encodeURIComponent(cnpj)}` : "";
    window.open(`/portal/tools/consulta-cnpj${query}`, "_blank", "noopener,noreferrer");
  }

  async function importCompanyByCnpj() {
    const cnpj = typeof currentCnpj === "string" ? currentCnpj : "";
    if (cnpj.replace(/\D/g, "").length !== 14) {
      toast.error("Informe um CNPJ completo antes de importar.");
      return;
    }

    setIsImportingCnpj(true);
    try {
      const result = await lookupCompanyProfileByCnpjAction(cnpj);
      if (!result.success || !result.data?.profile) {
        toast.error(result.message ?? "Nao foi possivel consultar o provedor oficial de CNPJ.");
        return;
      }

      const profile = result.data.profile as {
        cnpj: string;
        legalName: string;
        tradeName?: string;
        openingDate?: string;
        primaryCnae?: string;
        email?: string;
        phone?: string;
        address?: {
          cep?: string;
          street?: string;
          number?: string;
          complement?: string;
          district?: string;
          city?: string;
          state?: string;
          country?: string;
        };
      };

      form.setValue("cnpj", formatCNPJ(profile.cnpj), { shouldDirty: true });
      form.setValue("razaoSocial", profile.legalName ?? "", { shouldDirty: true });
      form.setValue("nomeFantasia", profile.tradeName ?? "", { shouldDirty: true });
      form.setValue("cnae", profile.primaryCnae ?? "", { shouldDirty: true });
      form.setValue("emailContato", profile.email ?? "", { shouldDirty: true });
      form.setValue("telefone", profile.phone ? formatPhone(profile.phone) : "", { shouldDirty: true });

      if (profile.openingDate) {
        form.setValue("dataFundacao", profile.openingDate, { shouldDirty: true });
      }

      if (profile.address) {
        form.setValue("address.cep", profile.address.cep ?? "", { shouldDirty: true });
        form.setValue("address.logradouro", profile.address.street ?? "", { shouldDirty: true });
        form.setValue("address.numero", profile.address.number ?? "", { shouldDirty: true });
        form.setValue("address.complemento", profile.address.complement ?? "", { shouldDirty: true });
        form.setValue("address.bairro", profile.address.district ?? "", { shouldDirty: true });
        form.setValue("address.cidade", profile.address.city ?? "", { shouldDirty: true });
        form.setValue("address.estado", profile.address.state ?? "", { shouldDirty: true });
        form.setValue("address.pais", profile.address.country ?? "BR", { shouldDirty: true });
      }

      toast.success("Dados do CNPJ importados para o cadastro.");
    } finally {
      setIsImportingCnpj(false);
    }
  }

  const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
    const normalizedZammadEmails = normalizeZammadEmails(zammadEmails);
    const normalizedContacts: CompanyContactInput[] = contacts.map((contact, index) => ({
      name: contact.name.trim(),
      email: contact.email.trim() || undefined,
      phone: contact.phone.trim() || undefined,
      whatsapp: contact.whatsapp.trim() || undefined,
      notes: contact.notes.trim() || undefined,
      isPrimary: index === 0 ? true : contact.isPrimary,
      source: contact.source,
      status: contact.status,
    }));

    const result =
      mode === "edit" && companyId
        ? await updateCompanyAction(companyId, data, normalizedZammadEmails, normalizedContacts)
        : await createCompanyAction(data, normalizedZammadEmails, normalizedContacts);
    if (!result.success) {
      toast.error(result.message ?? (mode === "edit" ? "Erro ao atualizar empresa." : "Erro ao cadastrar empresa."));
      return;
    }

    toast.success(result.message ?? (mode === "edit" ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso."));
    router.push(backHref);
    router.refresh();
  };

  const current = SECTIONS.find((s) => s.id === currentSection) ?? SECTIONS[0];
  const currentIndex = Math.max(SECTIONS.findIndex((s) => s.id === current.id), 0);
  const progressPct = Math.round(((currentIndex + 1) / SECTIONS.length) * 100);

  const sectionStateMap = useMemo(() => {
    return SECTIONS.reduce<Record<SectionId, "error" | "ready" | "idle">>((acc, section) => {
      const hasError = section.fields.some((field) => hasPath(errors, field));
      if (hasError) {
        acc[section.id] = "error";
        return acc;
      }
      const hasTouched = section.fields.some((field) => hasPath(dirtyFields, field));
      acc[section.id] = hasTouched ? "ready" : "idle";
      return acc;
    }, {} as Record<SectionId, "error" | "ready" | "idle">);
  }, [dirtyFields, errors]);

  function addZammadEmail() {
    const email = zammadEmailInput.trim().toLowerCase();
    if (!email) return;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      toast.error("Informe um e-mail valido para integracao Zammad.");
      return;
    }
    if (zammadEmails.some((item) => item.email === email)) {
      toast.error("Este e-mail já foi adicionado.");
      return;
    }
    setZammadEmails((prev) => [
      ...prev,
      {
        email,
        label: zammadEmailLabel.trim() || undefined,
        isActive: true,
      },
    ]);
    setZammadEmailInput("");
    setZammadEmailLabel("");
  }

  function addCompanyContact() {
    const nextContact = {
      name: contactDraft.name.trim(),
      email: contactDraft.email.trim().toLowerCase(),
      phone: contactDraft.phone.trim(),
      whatsapp: contactDraft.whatsapp.trim(),
      notes: contactDraft.notes.trim(),
      isPrimary: contacts.length === 0,
      source: contactDraft.source,
      status: contactDraft.status,
    };

    if (!nextContact.name) {
      toast.error("Informe o nome do contato.");
      return;
    }

    if (!nextContact.email && !nextContact.phone && !nextContact.whatsapp) {
      toast.error("Informe ao menos um canal do contato.");
      return;
    }

    setContacts((prev) => [...prev, nextContact]);
    setContactDraft({
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      notes: "",
      source: CompanyContactSource.MANUAL,
      status: CompanyContactStatus.LINKED,
    });
  }

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-2xl border border-border/50 bg-card/95 overflow-hidden shadow-xl">
      <ShineBorder borderWidth={1} duration={16} shineColor={["#2dd4bf", "#60a5fa", "#a78bfa"]} />
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4 bg-linear-to-r from-muted/30 via-background to-muted/20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary/70" />
            {mode === "edit" ? "Editar Empresa" : "Nova Empresa"}
          </h2>
          <p className="text-sm text-muted-foreground">{current.title} - {current.description}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      <div className="border-b border-border/50 px-6 py-3 bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do cadastro</span>
          <span className="font-medium text-foreground">{currentIndex + 1}/{SECTIONS.length}</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-[calc(100vh-260px)]">
          <aside className="w-56 border-r border-border/50 bg-muted/20 p-3 space-y-1 backdrop-blur-sm">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isCurrent = section.id === currentSection;
              const state = sectionStateMap[section.id];
              const hasError = state === "error";
              const isReady = state === "ready";

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setCurrentSection(section.id)}
                  className={cn(
                    "group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all border",
                    isCurrent ? "bg-primary/10 border-primary/20 shadow-sm" : "hover:bg-muted/70 border-transparent hover:border-border/50",
                  )}
                >
                  <div className={cn("mt-0.5 p-1.5 rounded-md", isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground", hasError && "bg-destructive/10 text-destructive")}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("text-sm font-medium truncate", isCurrent ? "text-primary" : "text-foreground", hasError && "text-destructive")}>
                        {section.title}
                      </p>
                      {isReady && !hasError && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{section.description}</p>
                    {isReady && !hasError && (
                      <Badge variant="outline" className="mt-1 h-5 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] text-emerald-600">
                        Pronto
                      </Badge>
                    )}
                  </div>
                  {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-primary/70 mt-1" />}
                </button>
              );
            })}
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
              {currentSection === "geral" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Identificacao</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="cnpj" render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between gap-2">
                            <FormLabel>CNPJ</FormLabel>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={openCnpjLookup}>
                                <ExternalLink className="h-3.5 w-3.5" />
                                Consulta manual
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={importCompanyByCnpj} disabled={isImportingCnpj}>
                                {isImportingCnpj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                Preencher automatico
                              </Button>
                            </div>
                          </div>
                          <FormControl><Input placeholder="00.000.000/0000-00" {...field} disabled={mode === "edit" && !canEditCnpj} value={toInputValue(field.value)} onChange={(event) => field.onChange(formatCNPJ(event.target.value))} /></FormControl>
                          <p className="text-[11px] text-muted-foreground">Arquitetura pronta para provedor oficial de CNPJ com auto-preenchimento server-side.</p>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value={CompanyStatus.ACTIVE}>Ativo</SelectItem><SelectItem value={CompanyStatus.INACTIVE}>Inativo</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="segment" render={({ field }) => (
                        <FormItem><FormLabel>Segmento</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definido</SelectItem>{Object.values(CompanySegment).map((segment) => <SelectItem key={segment} value={segment}>{COMPANY_SEGMENT_LABELS[segment]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                      <FormItem><FormLabel>Razao Social</FormLabel><FormControl><Input placeholder="Razao social" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                        <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input placeholder="Nome fantasia" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="logoUrl" render={({ field }) => (
                        <FormItem><FormLabel>URL da Logo</FormLabel><FormControl><Input placeholder="https://..." {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="dataFundacao" render={({ field }) => (
                      <FormItem><FormLabel>Data de Fundacao</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""} onChange={(event) => field.onChange(event.target.value || undefined)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "fiscal" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Fiscal</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="regimeTributario" render={({ field }) => (
                        <FormItem><FormLabel>Regime Tributario</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definido</SelectItem>{Object.values(TaxRegime).map((regime) => <SelectItem key={regime} value={regime}>{regime.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="indicadorIE" render={({ field }) => (
                        <FormItem><FormLabel>Indicador IE</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value={IndicadorIE.CONTRIBUINTE}>Contribuinte</SelectItem><SelectItem value={IndicadorIE.ISENTO}>Isento</SelectItem><SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>Nao contribuinte</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                        <FormItem><FormLabel>Inscricao Estadual</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                        <FormItem><FormLabel>Inscricao Municipal</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="cnae" render={({ field }) => (
                        <FormItem><FormLabel>CNAE</FormLabel><FormControl><Input placeholder="0000-0/00" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="codSuframa" render={({ field }) => (
                        <FormItem><FormLabel>Codigo SUFRAMA</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Estrutura empresarial</p>
                        <p className="text-xs text-muted-foreground">Hierarquia da empresa dentro do grupo e escritorio contabil vinculado.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="parentCompanyId" render={({ field }) => (
                          <FormItem><FormLabel>Empresa Matriz</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definida</SelectItem>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.nomeFantasia || company.razaoSocial}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="accountingFirmId" render={({ field }) => (
                          <FormItem><FormLabel>Escritorio Contabil</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definido</SelectItem>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.nomeFantasia || company.razaoSocial}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "configuracoes" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Configuracoes do servidor</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="serverType" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de servidor</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value={COMPANY_SERVER_TYPE_VALUES[0]}>Syspro Server</SelectItem><SelectItem value={COMPANY_SERVER_TYPE_VALUES[1]}>IIS</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="installationDirectory" render={({ field }) => (
                        <FormItem><FormLabel>Diretorio da instalacao</FormLabel><FormControl><Input placeholder="C:\\Syspro\\..." {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="serverPort" render={({ field }) => (
                        <FormItem><FormLabel>Porta</FormLabel><FormControl><Input type="number" {...field} value={String(field.value ?? 1234)} onChange={(event) => field.onChange(event.target.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="serverProtocol" render={({ field }) => (
                        <FormItem><FormLabel>Conexao</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{COMPANY_SERVER_PROTOCOL_VALUES.map((protocol) => <SelectItem key={protocol} value={protocol}>{protocol}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="serverHost" render={({ field }) => (
                        <FormItem><FormLabel>Servidor</FormLabel><FormControl><Input placeholder="localhost" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    {currentServerType === "IIS" ? (
                      <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-sm text-muted-foreground">
                          Para IIS, normalmente o campo Url Path (ISAPI) deve ser preenchido com
                          <span className="mx-1 font-medium text-foreground">SYSPROSERVERISAPI.DLL</span>
                          e apontar para o diretorio da instalacao configurado acima.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                          <FormField control={form.control} name="iisIsapiPath" render={({ field }) => (
                            <FormItem><FormLabel>Url Path (ISAPI)</FormLabel><FormControl><Input placeholder="SYSPROSERVERISAPI.DLL" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                        Padrao sugerido para novo cadastro: porta <span className="font-medium text-foreground">1234</span>, servidor <span className="font-medium text-foreground">localhost</span> e conexao <span className="font-medium text-foreground">HTTP</span>.
                      </div>
                    )}

                    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Conexoes remotas</p>
                          <p className="text-xs text-muted-foreground">Voce pode informar mais de uma conexao, como DDNS, Radmin VPN, IP ou nome da maquina.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remoteConnectionsFieldArray.append({ type: "DDNS_NOIP", details: "" })}
                        >
                          Adicionar conexao
                        </Button>
                      </div>

                      {remoteConnections.length ? (
                        <div className="space-y-3">
                          {remoteConnectionsFieldArray.fields.map((fieldItem, index) => (
                            <div key={fieldItem.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-background/70 p-3 md:grid-cols-[220px_1fr_auto]">
                              <div className="md:col-span-3">
                                <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                                  {REMOTE_CONNECTION_LABEL[(remoteConnections[index]?.type as CompanyRemoteConnectionInput["type"]) ?? "DDNS_NOIP"]}
                                </Badge>
                              </div>
                              <FormField control={form.control} name={`remoteConnections.${index}.type`} render={({ field }) => (
                                <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value={COMPANY_REMOTE_CONNECTION_TYPE_VALUES[0]}>DDNS (NoIP)</SelectItem><SelectItem value={COMPANY_REMOTE_CONNECTION_TYPE_VALUES[1]}>Radmin VPN</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name={`remoteConnections.${index}.details`} render={({ field }) => (
                                <FormItem><FormLabel>Nome/IP/identificacao</FormLabel><FormControl><Input placeholder="Ex.: empresa.ddns.net, 26.x.x.x, nome da maquina ou observacao da VPN" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <div className="flex items-end">
                                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remoteConnectionsFieldArray.remove(index)}>
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhuma conexao remota cadastrada ainda.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "endereco" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Endereco</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="address.cep" render={({ field }) => (
                        <FormItem><FormLabel>CEP</FormLabel><FormControl><div className="relative"><Input placeholder="00000-000" {...field} value={toInputValue(field.value)} onChange={(event) => handleCepChange(event.target.value)} />{isLoadingCep ? <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}</div></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.pais" render={({ field }) => (
                        <FormItem><FormLabel>Pais</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="address.logradouro" render={({ field }) => (
                      <FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="address.numero" render={({ field }) => (
                        <FormItem><FormLabel>Numero</FormLabel><FormControl><Input id="numero-input" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.complemento" render={({ field }) => (
                        <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.bairro" render={({ field }) => (
                        <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cidade e UF sao preenchidos automaticamente via CEP e podem ser ajustados manualmente quando necessario.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="address.cidade" render={({ field }) => (
                        <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.estado" render={({ field }) => (
                        <FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} maxLength={2} className="uppercase" value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "contato" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="emailContato" render={({ field }) => (
                        <FormItem><FormLabel>E-mail Comercial</FormLabel><FormControl><Input type="email" placeholder="comercial@empresa.com.br" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="emailFinanceiro" render={({ field }) => (
                        <FormItem><FormLabel>E-mail Financeiro</FormLabel><FormControl><Input type="email" placeholder="financeiro@empresa.com.br" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="telefone" render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} onChange={(event) => field.onChange(formatPhone(event.target.value))} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="whatsapp" render={({ field }) => (
                        <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} onChange={(event) => field.onChange(formatPhone(event.target.value))} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="website" render={({ field }) => (
                        <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://www.empresa.com.br" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="observacoes" render={({ field }) => (
                      <FormItem><FormLabel>Observacoes</FormLabel><FormControl><Textarea rows={4} placeholder="Observacoes internas" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-start gap-2">
                        <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Central de contatos</p>
                          <p className="text-xs text-muted-foreground">
                            Base operacional para atendimento, vinculo com empresa e preparo do futuro fluxo de conversa/WhatsApp.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        <BadgeHelp className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <p>
                          `User` e autenticavel. `Contato` e identidade operacional de conversa. Quando um contato precisar entrar na plataforma, ele podera ser promovido depois para usuario.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contatos vinculados</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{linkedContactsCount}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pendentes de vinculo</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{pendingContactsCount}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Origem WhatsApp</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{whatsappContactsCount}</p>
                        </div>
                      </div>

                      <Tabs defaultValue="listagem" className="space-y-3">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="listagem">Contatos</TabsTrigger>
                          <TabsTrigger value="novo">Novo contato</TabsTrigger>
                          <TabsTrigger value="zammad">Zammad</TabsTrigger>
                        </TabsList>

                        <TabsContent value="listagem" className="space-y-3">
                          {contacts.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum contato operacional configurado.</p>
                          ) : (
                            <div className="space-y-2">
                              {contacts.map((contact, index) => (
                                <div key={`${contact.name}-${contact.email}-${index}`} className="rounded-md border border-border/60 px-3 py-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium">{contact.name}</span>
                                        {index === 0 ? <Badge variant="outline">Principal</Badge> : null}
                                        <Badge variant="outline" className={cn("border-border/60 bg-background/70", CONTACT_STATUS_BADGE[contact.status])}>
                                          {CONTACT_STATUS_LABEL[contact.status]}
                                        </Badge>
                                        <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                                          {CONTACT_SOURCE_LABEL[contact.source]}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {contact.email ? <span>{contact.email}</span> : null}
                                        {contact.phone ? <span>{contact.phone}</span> : null}
                                        {contact.whatsapp ? <span>{contact.whatsapp}</span> : null}
                                      </div>
                                      {contact.notes ? <p className="text-xs text-muted-foreground">{contact.notes}</p> : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {index !== 0 ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setContacts((prev) => {
                                              const next = [...prev];
                                              const [selected] = next.splice(index, 1);
                                              return [selected, ...next.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === 0 }))];
                                            })
                                          }
                                        >
                                          Tornar principal
                                        </Button>
                                      ) : null}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setContacts((prev) =>
                                            prev.map((item, itemIndex) =>
                                              itemIndex === index
                                                ? {
                                                    ...item,
                                                    status:
                                                      item.status === CompanyContactStatus.ARCHIVED
                                                        ? CompanyContactStatus.LINKED
                                                        : CompanyContactStatus.ARCHIVED,
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                      >
                                        {contact.status === CompanyContactStatus.ARCHIVED ? "Reativar" : "Arquivar"}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setContacts((prev) => prev.filter((_, contactIndex) => contactIndex !== index))}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="novo" className="space-y-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <Input
                              placeholder="Nome do contato"
                              value={contactDraft.name}
                              onChange={(event) => setContactDraft((prev) => ({ ...prev, name: event.target.value }))}
                            />
                            <Input
                              type="email"
                              placeholder="contato@empresa.com.br"
                              value={contactDraft.email}
                              onChange={(event) => setContactDraft((prev) => ({ ...prev, email: event.target.value }))}
                            />
                            <Input
                              placeholder="Telefone"
                              value={contactDraft.phone}
                              onChange={(event) =>
                                setContactDraft((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))
                              }
                            />
                            <Input
                              placeholder="WhatsApp"
                              value={contactDraft.whatsapp}
                              onChange={(event) =>
                                setContactDraft((prev) => ({ ...prev, whatsapp: formatPhone(event.target.value) }))
                              }
                            />
                            <Select
                              value={contactDraft.source}
                              onValueChange={(value) =>
                                setContactDraft((prev) => ({ ...prev, source: value as CompanyContactSource }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Origem do contato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={CompanyContactSource.MANUAL}>Manual</SelectItem>
                                <SelectItem value={CompanyContactSource.WHATSAPP}>WhatsApp</SelectItem>
                                <SelectItem value={CompanyContactSource.IMPORT}>Importado</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={contactDraft.status}
                              onValueChange={(value) =>
                                setContactDraft((prev) => ({ ...prev, status: value as CompanyContactStatus }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Status do contato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={CompanyContactStatus.LINKED}>Vinculado</SelectItem>
                                <SelectItem value={CompanyContactStatus.PENDING_LINK}>Pendente de vinculo</SelectItem>
                                <SelectItem value={CompanyContactStatus.ARCHIVED}>Arquivado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            rows={2}
                            placeholder="Observacoes do contato"
                            value={contactDraft.notes}
                            onChange={(event) => setContactDraft((prev) => ({ ...prev, notes: event.target.value }))}
                          />
                          <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={addCompanyContact}>
                              Adicionar contato
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="zammad" className="space-y-3">
                          <div>
                            <p className="text-sm font-medium">E-mails vinculados ao Zammad</p>
                            <p className="text-xs text-muted-foreground">
                              Use esta lista para incluir caixas compartilhadas da empresa (ex.: suporte@, fiscal@).
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                            <Input
                              type="email"
                              placeholder="suporte@empresa.com.br"
                              value={zammadEmailInput}
                              onChange={(event) => setZammadEmailInput(event.target.value)}
                            />
                            <Input
                              placeholder="Label (opcional)"
                              value={zammadEmailLabel}
                              onChange={(event) => setZammadEmailLabel(event.target.value)}
                            />
                            <Button type="button" variant="outline" onClick={addZammadEmail}>
                              Adicionar
                            </Button>
                          </div>
                          {zammadEmails.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum e-mail adicional configurado.</p>
                          ) : (
                            <div className="space-y-2">
                              {zammadEmails.map((item) => (
                                <div key={item.email} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                                    <span className="text-sm font-medium">{item.email}</span>
                                    {item.label ? <span className="text-xs text-muted-foreground">({item.label})</span> : null}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setZammadEmails((prev) =>
                                          prev.map((current) =>
                                            current.email === item.email
                                              ? { ...current, isActive: !(current.isActive ?? true) }
                                              : current,
                                          ),
                                        )
                                      }
                                    >
                                      {item.isActive ? "Desativar" : "Ativar"}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setZammadEmails((prev) => prev.filter((current) => current.email !== item.email))}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>
                </MagicCard>
              )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-border/50 px-6 py-4 flex items-center justify-between">
              <div>
                {Object.keys(errors).length > 0 && (
                  <Badge variant="destructive" className="text-[11px] gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Campos invalidos
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2" disabled={isSubmitting || !canSubmit}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {mode === "edit" ? "Salvar Alteracoes" : "Salvar Empresa"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

