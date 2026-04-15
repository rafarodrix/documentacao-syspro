"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, type TicketFormInput, type TicketFormOutput } from "@dosc-syspro/contracts/ticket";
import { DEFAULT_TICKET_MODULE_SETTINGS, type TicketModuleSettings } from "@dosc-syspro/contracts/ticket";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShineBorder } from "@/components/magicui/ShineBorder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { createTicketAction, getUserLinkedCompaniesAction } from "@/features/tickets/application/ticket-actions";
import { useEffect } from "react";
import { TicketAttachmentField } from "@/features/tickets/interface/components/TicketAttachmentField";
import {
  TicketCompanyPicker,
  type TicketCompanyPickerOption,
} from "@/features/tickets/interface/components/TicketCompanyPicker";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full bg-muted/20 animate-pulse rounded-xl border border-border/50" />
  ),
});
import "react-quill-new/dist/quill.snow.css";

// ─── Types ───────────────────────────────────────────────────────────────────
type CustomerEmailOption = {
  companyId: string;
  email: string;
  companyName: string;
  contactName: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
};

interface CreateTicketPageFormProps {
  isSystemUser: boolean;
}

// ─── Priority & Type configs ─────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  "1 low": { label: "Baixa", color: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
  "2 normal": { label: "Normal", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  "3 high": { label: "Alta (Urgente)", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
} as const;

const TYPE_CONFIG = {
  incident: { label: "Incidente / Erro", icon: "🔴" },
  question: { label: "Duvida", icon: "🔵" },
  request: { label: "Solicitacao", icon: "🟢" },
} as const;

type PriorityKey = keyof typeof PRIORITY_CONFIG;
type TypeKey = keyof typeof TYPE_CONFIG;

// ─── Main Component ──────────────────────────────────────────────────────────
export function CreateTicketPageForm({ isSystemUser }: CreateTicketPageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCompany, setCustomerCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerEmailOption[]>([]);
  const [isCustomerOptionsLoading, setIsCustomerOptionsLoading] = useState(false);
  const [clientCompanies, setClientCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [ticketSettings, setTicketSettings] = useState<TicketModuleSettings>(DEFAULT_TICKET_MODULE_SETTINGS);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_TICKET_MODULE_SETTINGS.categories[0]?.value ?? "incident");
  const [selectedModule, setSelectedModule] = useState(DEFAULT_TICKET_MODULE_SETTINGS.modules[0]?.value ?? "");
  const [selectedEnvironment, setSelectedEnvironment] = useState(DEFAULT_TICKET_MODULE_SETTINGS.defaultEnvironment);
  const [selectedTeam, setSelectedTeam] = useState(DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam);

  const form = useForm<TicketFormInput, undefined, TicketFormOutput>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      type: "incident",
      description: "",
      priority: "2 normal",
    },
  });

  const watchedSubject = form.watch("subject");
  const watchedType = form.watch("type") as TypeKey;
  const watchedPriority = form.watch("priority") as PriorityKey;
  const selectedClientCompany = clientCompanies.find((company) => company.id === selectedCompanyId) ?? null;
  const selectedSystemOption = customerOptions.find(
    (option) =>
      option.companyId === selectedCompanyId &&
      option.email === customerEmail.trim().toLowerCase(),
  ) ?? null;
  const systemCompanyOptions: TicketCompanyPickerOption[] = customerOptions.map((option) => ({
    id: `${option.companyId}::${option.email}`,
    label: option.companyName,
    description: option.contactName || option.email,
    meta: option.contactName ? option.email : null,
  }));
  const clientCompanyOptions: TicketCompanyPickerOption[] = clientCompanies.map((company) => ({
    id: company.id,
    label: company.name,
  }));

  // ── Load client companies ──────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
        if (!active || !json.success || !json.data) return;

        setTicketSettings(json.data);
        setSelectedCategory(json.data.categories[0]?.value || "incident");
        setSelectedModule(json.data.modules[0]?.value || "");
        setSelectedEnvironment(json.data.defaultEnvironment);
        setSelectedTeam(json.data.defaultTeam);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSystemUser) {
      getUserLinkedCompaniesAction()
        .then((res) => {
          if (res.success && res.data) {
            setClientCompanies(res.data);
            if (res.data.length === 1) {
              setSelectedCompanyId(res.data[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isSystemUser]);

  // ── Customer search (system users) ─────────────────────────────────────
  useEffect(() => {
    if (!isSystemUser) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        if (!searchQuery.trim()) {
          setCustomerOptions([]);
          return;
        }
        setIsCustomerOptionsLoading(true);
        const params = new URLSearchParams();
        params.set("q", searchQuery.trim());
        params.set("limit", "15");
        const response = await fetch(`/api/platform/tickets/customer-emails?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          setCustomerOptions([]);
          return;
        }
        const json = (await response.json()) as { options?: CustomerEmailOption[] };
        setCustomerOptions(Array.isArray(json.options) ? json.options : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setCustomerOptions([]);
      } finally {
        setIsCustomerOptionsLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, isSystemUser]);

  // ── File handlers ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const totalSize = [...files, ...newFiles].reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 5 * 1024 * 1024) {
      toast.error("O tamanho total dos arquivos nao pode exceder 5MB.");
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  // ── Sync description html → form field ─────────────────────────────────
  useEffect(() => {
    const text = descriptionHtml.replace(/<[^>]*>?/gm, "").trim();
    form.setValue("description", text, { shouldValidate: text.length > 0 });
  }, [descriptionHtml, form]);

  // ── Progress ───────────────────────────────────────────────────────────
  const progressPct = useMemo(() => {
    const items = [
      watchedSubject.trim().length >= 5,
      descriptionHtml.replace(/<[^>]*>?/gm, "").trim().length >= 20,
      isSystemUser ? !!selectedCompanyId || !!customerEmail.trim() : true,
    ];
    const completed = items.filter(Boolean).length;
    return Math.round((completed / items.length) * 100);
  }, [watchedSubject, descriptionHtml, isSystemUser, customerEmail, selectedCompanyId]);

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleFormSubmit = (data: TicketFormOutput) => {
    if (isSystemUser && !selectedCompanyId && !customerEmail.trim()) {
      toast.error("Selecione a empresa ou contato do cliente para abrir o chamado.");
      return;
    }
    if (!isSystemUser && clientCompanies.length > 1 && !selectedCompanyId) {
      toast.error("Selecione para qual empresa o chamado esta sendo aberto.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("subject", data.subject);
        formData.append("description", descriptionHtml || data.description);
        formData.append("priority", data.priority);
        formData.append("type", data.type);
        if (isSystemUser) {
          if (customerEmail.trim()) {
            formData.append("customerEmail", customerEmail.trim().toLowerCase());
          }
          if (selectedCompanyId) {
            formData.append("companyId", selectedCompanyId);
          }
        } else if (selectedCompanyId) {
          formData.append("userSelectedCompanyId", selectedCompanyId);
        }
        if (selectedCategory) formData.append("category", selectedCategory);
        if (selectedModule) formData.append("module", selectedModule);
        if (selectedEnvironment) formData.append("environment", selectedEnvironment);
        if (selectedTeam) formData.append("team", selectedTeam);
        files.forEach((file) => formData.append("attachments", file));

        const result = await createTicketAction(null, formData);
        if (result.success) {
          toast.success("Chamado aberto com sucesso!");
          router.push("/portal/tickets");
          router.refresh();
        } else {
          toast.error(result.message || "Erro ao criar chamado.");
        }
      } catch {
        toast.error("Erro inesperado ao criar chamado.");
      }
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-xl">
      <ShineBorder borderWidth={1} duration={16} shineColor={["#f97316", "#3b82f6", "#8b5cf6"]} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 bg-gradient-to-r from-muted/30 via-background to-muted/20 px-6 py-4">
        <div>
          <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary/70" />
            Nova Solicitacao
          </h2>
          <p className="text-sm text-muted-foreground">Descreva seu problema ou duvida detalhadamente para que possamos atende-lo da melhor forma.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push("/portal/tickets")}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <div className="border-b border-border/50 bg-muted/20 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do preechimento</span>
          <span className="font-medium text-foreground">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              progressPct === 100 ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex min-h-[calc(100vh-280px)] flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-full">

              {/* ── Main content (8 cols) ───────────────────────────────── */}
              <div className="lg:col-span-8 p-6 space-y-6 lg:border-r border-border/40">

                {/* Summary cards */}
                <div className="grid gap-3 grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Assunto</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{watchedSubject || "Pendente"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tipo</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">{TYPE_CONFIG[watchedType]?.icon} {TYPE_CONFIG[watchedType]?.label || watchedType}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Anexos</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">{files.length} arquivo(s)</p>
                  </div>
                </div>

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Assunto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Erro ao emitir Nota Fiscal, sistema travando ao salvar..."
                          className="h-11 bg-muted/30 focus:bg-background text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description (Rich Text) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descricao detalhada</Label>
                  <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border/40 [&_.ql-toolbar]:bg-muted/30 [&_.ql-container]:border-none [&_.ql-editor]:min-h-40 [&_.ql-editor]:text-sm [&_.ql-editor.ql-blank::before]:text-muted-foreground/60">
                    <ReactQuill
                      theme="snow"
                      value={descriptionHtml}
                      onChange={setDescriptionHtml}
                      placeholder="Descreva o passo a passo de como reproduzir o problema, o que aconteceu e o que era esperado..."
                      modules={{
                        toolbar: [
                          ["bold", "italic", "underline", "strike"],
                          [{ list: "ordered" }, { list: "bullet" }],
                          ["blockquote", "code-block"],
                          ["clean"],
                        ],
                      }}
                    />
                  </div>
                  {form.formState.errors.description && (
                    <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Quanto mais detalhes, mais rapido o atendimento.
                  </p>
                </div>

                {/* Attachments */}
                <TicketAttachmentField
                  files={files}
                  inputRef={fileInputRef}
                  onChange={handleFileChange}
                  onRemove={removeFile}
                />
              </div>

              {/* ── Sidebar (4 cols) ────────────────────────────────────── */}
              <div className="lg:col-span-4 p-6 space-y-5 bg-muted/5">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                    Metadados do chamado
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Classifique o chamado para agilizar o atendimento.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione a categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketSettings.categories.map((category) => (
                        <SelectItem key={category.id} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione o tipo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="incident">🔴 Incidente / Erro</SelectItem>
                          <SelectItem value="question">🔵 Duvida</SelectItem>
                          <SelectItem value="request">🟢 Solicitacao</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1 low">Baixa</SelectItem>
                          <SelectItem value="2 normal">Normal</SelectItem>
                          <SelectItem value="3 high">Alta (Urgente)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="pt-1">
                        <Badge variant="outline" className={cn("text-[10px] px-2", PRIORITY_CONFIG[watchedPriority]?.color)}>
                          {PRIORITY_CONFIG[watchedPriority]?.label || "Normal"}
                        </Badge>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modulo</Label>
                  <Select value={selectedModule} onValueChange={setSelectedModule}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o modulo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketSettings.modules.map((moduleOption) => (
                        <SelectItem key={moduleOption.id} value={moduleOption.value}>
                          {moduleOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ambiente</Label>
                  <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o ambiente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketSettings.environments.map((environment) => (
                        <SelectItem key={environment.id} value={environment.value}>
                          {environment.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer (system users) */}
                {isSystemUser && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa / contato</Label>
                    <TicketCompanyPicker
                      value={selectedSystemOption ? `${selectedSystemOption.companyId}::${selectedSystemOption.email}` : ""}
                      options={systemCompanyOptions}
                      onChange={(value) => {
                        const [companyId, email] = value.split("::");
                        const option = customerOptions.find((item) => item.companyId === companyId && item.email === email);
                        setSelectedCompanyId(companyId || "");
                        setCustomerEmail(option?.email || email || "");
                        setCustomerCompany(option?.companyName || null);
                      }}
                      placeholder="Buscar empresa, contato ou e-mail..."
                      searchPlaceholder="Digite empresa, contato ou e-mail..."
                      emptyMessage={isCustomerOptionsLoading ? "Buscando..." : "Nenhum cliente encontrado."}
                      className="bg-background text-xs"
                    />
                    <div className="space-y-1">
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Refinar busca por empresa, contato ou e-mail..."
                        className="h-9 bg-background text-xs"
                      />
                      {isCustomerOptionsLoading ? (
                        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Buscando contexto do cliente...
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">A busca considera empresa, contato e e-mail.</p>
                      )}
                    </div>
                    {(customerEmail && customerCompany) || selectedCompanyId ? (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-3 text-xs space-y-1">
                          <p className="font-medium text-foreground">{customerCompany || "Empresa vinculada ao ticket"}</p>
                          {customerEmail ? <p className="text-muted-foreground">{customerEmail}</p> : null}
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                )}

                {/* Company (client users) */}
                {!isSystemUser && clientCompanies.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</Label>
                    <TicketCompanyPicker
                      value={selectedCompanyId}
                      options={clientCompanyOptions}
                      onChange={setSelectedCompanyId}
                      placeholder="Selecione a empresa"
                      searchPlaceholder="Buscar empresa vinculada..."
                      className="bg-background text-xs"
                    />
                  </div>
                )}

                {!isSystemUser && clientCompanies.length === 1 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</Label>
                    <Card className="border-border/50">
                      <CardContent className="p-3 text-xs">
                        <p className="font-medium flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {selectedClientCompany?.name || clientCompanies[0].name}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {isSystemUser ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor atual</Label>
                    <Select value={selectedTeam} onValueChange={(value) => setSelectedTeam(value as "SUPORTE" | "DESENVOLVIMENTO")}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione o setor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketSettings.teams.map((team) => (
                          <SelectItem key={team.id} value={team.value}>
                            {team.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {/* Completion badges */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Checklist</p>
                  <div className="space-y-1.5">
                    <ChecklistItem done={watchedSubject.trim().length >= 5} label="Assunto preenchido" />
                    <ChecklistItem done={descriptionHtml.replace(/<[^>]*>?/gm, "").trim().length >= 20} label="Descricao detalhada" />
                    {isSystemUser && <ChecklistItem done={!!selectedCompanyId || !!customerEmail.trim()} label="Empresa ou contato selecionado" />}
                    {!isSystemUser && clientCompanies.length > 1 && <ChecklistItem done={!!selectedCompanyId} label="Empresa selecionada" />}
                    <ChecklistItem done={files.length > 0} label="Anexos adicionados" optional />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 border-t border-border/50 px-6 py-4 bg-muted/10">
            <Button type="button" variant="ghost" onClick={() => router.push("/portal/tickets")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || progressPct < 66}
              className="gap-2 shadow-lg shadow-primary/20 min-w-[160px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Abrir Chamado
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ChecklistItem({ done, label, optional }: { done: boolean; label: string; optional?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs rounded-md px-2 py-1.5 transition-colors", done ? "text-foreground" : "text-muted-foreground")}>
      <div className={cn(
        "h-4 w-4 rounded-full border flex items-center justify-center transition-all shrink-0",
        done ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/60",
      )}>
        {done && <Check className="h-2.5 w-2.5" />}
      </div>
      <span className={cn(done && "line-through opacity-60")}>{label}</span>
      {optional && !done && <span className="text-[10px] text-muted-foreground italic ml-auto">opcional</span>}
    </div>
  );
}
