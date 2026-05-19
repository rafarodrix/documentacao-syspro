"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent, type ClipboardEvent as ReactClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Code2,
  Headphones,
  Loader2,
  Send,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  TICKET_ATTACHMENT_ACCEPT_ATTRIBUTE,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_REPLY_MAX_ATTACHMENTS,
  isAllowedTicketAttachmentMimeType,
  ticketFormSchema,
  type TicketFormInput,
  type TicketFormOutput,
  type TicketModuleSettings,
  type TicketModuleSettingsPriority,
} from "@dosc-syspro/contracts/ticket";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { createTicketAction, getUserLinkedCompaniesAction } from "@/features/tickets/application/ticket-actions";
import {
  TicketCompanyPicker,
  type TicketCompanyPickerOption,
} from "@/features/tickets/interface/components/ticket-company-picker";
import { TicketAttachmentField } from "@/features/tickets/interface/components/ticket-attachment-field";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/ticket-module-cascade-select";
import {
  getSuggestedCategoryForTeam,
  useTicketModuleSettings,
} from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { TicketRichTextEditor } from "@/features/tickets/interface/components/ticket-rich-text-editor";
import { markdownToPlainText, normalizeTicketMarkdownInput } from "@/features/tickets/lib/ticket-markdown";

type CustomerEmailOption = {
  companyId: string;
  email: string;
  companyName: string;
  legalName?: string | null;
  cnpj?: string | null;
  contactName: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
};

interface CreateTicketPageFormProps {
  hasInternalTicketAccess: boolean;
  initialContext?: {
    source?: string;
    chatwootConversationId?: string;
    chatwootContactId?: string;
    chatwootAccountId?: string;
    chatwootConversationUrl?: string;
    customerName?: string;
    customerPhone?: string;
    customerWhatsapp?: string;
    customerEmail?: string;
    companyId?: string;
    subject?: string;
    description?: string;
  };
}

type TicketTeam = "SUPORTE" | "DESENVOLVIMENTO";

function getTeamLabel(settings: TicketModuleSettings, team: string) {
  return settings.teams.find((item) => item.value === team)?.label || (team === "DESENVOLVIMENTO" ? "Desenvolvimento" : "Suporte");
}

function normalizeTicketTeam(value: string): TicketTeam {
  return value === "DESENVOLVIMENTO" ? "DESENVOLVIMENTO" : "SUPORTE";
}

export function CreateTicketPageForm({ hasInternalTicketAccess, initialContext }: CreateTicketPageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const source = initialContext?.source === "chatwoot" ? "chatwoot" : "portal";
  const chatwootConversationId = initialContext?.chatwootConversationId?.trim() || "";
  const chatwootContactId = initialContext?.chatwootContactId?.trim() || "";
  const chatwootAccountId = initialContext?.chatwootAccountId?.trim() || "";
  const chatwootConversationUrl = initialContext?.chatwootConversationUrl?.trim() || "";
  const customerName = initialContext?.customerName?.trim() || "";
  const customerPhone = initialContext?.customerPhone?.trim() || "";
  const customerWhatsapp = initialContext?.customerWhatsapp?.trim() || "";

  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(initialContext?.customerEmail?.trim().toLowerCase() || "");
  const [customerCompany, setCustomerCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerEmailOption[]>([]);
  const [isCustomerOptionsLoading, setIsCustomerOptionsLoading] = useState(false);
  const [customerOptionsError, setCustomerOptionsError] = useState<string | null>(null);
  const [clientCompanies, setClientCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialContext?.companyId?.trim() || "");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState(
    normalizeTicketMarkdownInput(initialContext?.description?.trim() || ""),
  );
  const ticketSettings = useTicketModuleSettings();
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_TICKET_MODULE_SETTINGS.categories[0]?.value ?? "incident");
  const [selectedModule, setSelectedModule] = useState(DEFAULT_TICKET_MODULE_SETTINGS.modules[0]?.value ?? "");
  const [selectedTeam, setSelectedTeam] = useState<TicketTeam>(hasInternalTicketAccess ? DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam : "SUPORTE");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [developmentVideoUrl, setDevelopmentVideoUrl] = useState("");

  const form = useForm<TicketFormInput, undefined, TicketFormOutput>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: initialContext?.subject?.trim() || "",
      type: "incident",
      description: "",
      priority: DEFAULT_TICKET_MODULE_SETTINGS.defaultPriority,
    },
  });

  const watchedSubject = form.watch("subject");
  const descriptionText = markdownToPlainText(descriptionMarkdown);
  const selectedClientCompany = clientCompanies.find((company) => company.id === selectedCompanyId) ?? null;
  const selectedInternalCompanyOption = useMemo(
    () =>
      customerOptions.find(
        (item) =>
          item.companyId === selectedCompanyId &&
          ((customerEmail && item.email === customerEmail) || item.companyName === customerCompany),
      ) ?? null,
    [customerCompany, customerEmail, customerOptions, selectedCompanyId],
  );

  const filteredCategories = useMemo(
    () => ticketSettings.categories.filter((category) => !selectedTeam || category.defaultTeam === selectedTeam),
    [selectedTeam, ticketSettings.categories],
  );

  const internalCompanyOptions: TicketCompanyPickerOption[] = useMemo(() => {
    const opts: TicketCompanyPickerOption[] = [];
    const usedIds = new Set<string>();

    for (const option of customerOptions) {
      let baseId = option.email ? `${option.companyId}::${option.email}` : `${option.companyId}::`;
      if (usedIds.has(baseId)) {
        baseId = `${baseId}::${option.contactName || option.companyName}`;
      }
      usedIds.add(baseId);

      const hasContact = Boolean(option.contactName?.trim());
      const companySupportText = [option.companyName, option.legalName, option.cnpj].filter(Boolean).join(" • ");
      const contactSupportText = [option.legalName, option.cnpj, option.email].filter(Boolean).join(" • ");

      opts.push({
        id: baseId,
        label: hasContact ? option.contactName || option.companyName : option.companyName,
        description: hasContact ? companySupportText : [option.legalName, option.cnpj].filter(Boolean).join(" • "),
        meta: hasContact ? contactSupportText : null,
      });
    }

    if (selectedCompanyId) {
      const currentId = customerEmail ? `${selectedCompanyId}::${customerEmail}` : `${selectedCompanyId}::`;
      if (!opts.some((option) => option.id === currentId || option.id.startsWith(`${currentId}::`))) {
        opts.push({
          id: currentId,
          label: customerCompany || "Empresa selecionada",
          description: customerEmail || undefined,
        });
      }
    }

    return opts;
  }, [customerOptions, selectedCompanyId, customerEmail, customerCompany]);

  const clientCompanyOptions: TicketCompanyPickerOption[] = clientCompanies.map((company) => ({
    id: company.id,
    label: company.name,
  }));

  const requiresAssociatedCompany = source === "chatwoot";
  const companyRequirementMet = hasInternalTicketAccess
    ? requiresAssociatedCompany
      ? Boolean(selectedCompanyId)
      : Boolean(selectedCompanyId || customerEmail.trim())
    : clientCompanies.length <= 1 || Boolean(selectedCompanyId);

  const canSubmit =
    companyRequirementMet &&
    watchedSubject.trim().length >= 5 &&
    descriptionText.length >= 20 &&
    Boolean(selectedTeam && selectedCategory && selectedModule) &&
    !isPending;

  useEffect(() => {
    const nextTeam: TicketTeam = hasInternalTicketAccess ? ticketSettings.defaultTeam : "SUPORTE";
    const nextCategory =
      getSuggestedCategoryForTeam(ticketSettings, nextTeam) ||
      ticketSettings.categories[0]?.value ||
      "incident";

    setSelectedTeam(nextTeam);
    setSelectedCategory(nextCategory);
    setSelectedModule((current) => current || ticketSettings.modules[0]?.value || "");
    form.setValue("priority", ticketSettings.defaultPriority, { shouldValidate: false });
  }, [form, hasInternalTicketAccess, ticketSettings]);

  useEffect(() => {
    if (hasInternalTicketAccess) return;

    getUserLinkedCompaniesAction()
      .then((res) => {
        if (res.success && res.data) {
          setClientCompanies(res.data);
          if (res.data.length === 1) {
            setSelectedCompanyId(res.data[0].id);
          }
        }
      })
      .catch(() => undefined);
  }, [hasInternalTicketAccess]);

  useEffect(() => {
    if (!hasInternalTicketAccess) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsCustomerOptionsLoading(true);
        const params = new URLSearchParams();
        params.set("q", searchQuery.trim());
        params.set("limit", "15");

        const response = await fetch(`/api/platform/tickets/customer-emails?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          const json = (await response.json().catch(() => null)) as { error?: string } | null;
          setCustomerOptionsError(json?.error || "Falha ao consultar empresas.");
          setCustomerOptions([]);
          return;
        }

        const json = (await response.json()) as { options?: CustomerEmailOption[] };
        setCustomerOptionsError(null);
        setCustomerOptions(Array.isArray(json.options) ? json.options : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCustomerOptionsError("Falha ao consultar empresas.");
          setCustomerOptions([]);
        }
      } finally {
        setIsCustomerOptionsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, hasInternalTicketAccess]);

  useEffect(() => {
    form.setValue("description", descriptionText, { shouldValidate: descriptionText.length > 0 });
  }, [descriptionText, form]);

  useEffect(() => {
    if (initialContext?.subject?.trim()) {
      form.setValue("subject", initialContext.subject.trim(), { shouldValidate: true });
    }
  }, [form, initialContext?.subject]);

  const appendFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;
    const valid = newFiles.filter((file) => file.size <= TICKET_ATTACHMENT_MAX_BYTES && isAllowedTicketAttachmentMimeType(file.type || ""));
    if (valid.length < newFiles.length) {
      toast.warning("Alguns arquivos foram ignorados por tipo nao suportado ou por excederem 5MB.");
    }

    setFiles((current) => {
      const remainingSlots = Math.max(0, TICKET_REPLY_MAX_ATTACHMENTS - current.length);
      if (remainingSlots === 0) {
        toast.warning(`Limite de ${TICKET_REPLY_MAX_ATTACHMENTS} anexos por ticket.`);
        return current;
      }

      const nextFiles = valid.slice(0, remainingSlots);
      if (nextFiles.length < valid.length) {
        toast.warning(`Somente ${TICKET_REPLY_MAX_ATTACHMENTS} anexos podem ser enviados por ticket.`);
      }

      return [...current, ...nextFiles];
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    appendFiles(Array.from(event.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleDescriptionPaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (!pastedFiles.length) {
      return;
    }

    event.preventDefault();
    appendFiles(pastedFiles);
    toast.success(
      pastedFiles.length === 1
        ? "Imagem anexada a partir da area de transferencia."
        : `${pastedFiles.length} arquivos anexados a partir da area de transferencia.`,
    );
  };

  const handleTeamChange = (value: string) => {
    const team = normalizeTicketTeam(value);
    setSelectedTeam(team);
    const suggestedCategory = getSuggestedCategoryForTeam(ticketSettings, team);
    if (suggestedCategory) {
      setSelectedCategory(suggestedCategory);
    }
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    const category = ticketSettings.categories.find((item) => item.value === categoryValue);
    if (category?.defaultTeam) {
      setSelectedTeam(hasInternalTicketAccess ? category.defaultTeam : "SUPORTE");
    }
  };

  const handleFormSubmit = (data: TicketFormOutput) => {
    if (!companyRequirementMet) {
      toast.error(hasInternalTicketAccess ? "Selecione a empresa ou contato do cliente." : "Selecione a empresa do chamado.");
      return;
    }

    if (!canSubmit) {
      toast.error("Complete os campos obrigatorios antes de abrir o chamado.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("subject", data.subject);
        formData.append("description", descriptionMarkdown || data.description);
        formData.append("priority", data.priority);
        formData.append("type", data.type);

        if (hasInternalTicketAccess) {
          if (customerEmail.trim()) formData.append("customerEmail", customerEmail.trim().toLowerCase());
          if (selectedCompanyId) formData.append("companyId", selectedCompanyId);
        } else if (selectedCompanyId) {
          formData.append("userSelectedCompanyId", selectedCompanyId);
        }

        if (selectedCategory) formData.append("category", selectedCategory);
        if (selectedModule) formData.append("module", selectedModule);
        if (selectedTeam) formData.append("team", selectedTeam);
        if (databaseUrl.trim()) formData.append("databaseUrl", databaseUrl.trim());
        if (developmentVideoUrl.trim()) formData.append("developmentVideoUrl", developmentVideoUrl.trim());
        formData.append("source", source);
        if (chatwootConversationId) formData.append("chatwootConversationId", chatwootConversationId);
        if (chatwootContactId) formData.append("chatwootContactId", chatwootContactId);
        if (chatwootAccountId) formData.append("chatwootAccountId", chatwootAccountId);
        if (chatwootConversationUrl) formData.append("chatwootConversationUrl", chatwootConversationUrl);
        if (customerName) formData.append("customerName", customerName);
        if (customerPhone) formData.append("customerPhone", customerPhone);
        if (customerWhatsapp) formData.append("customerWhatsapp", customerWhatsapp);
        files.forEach((file) => formData.append("attachments", file));

        const result = await createTicketAction(null, formData);
        if (result.success) {
          toast.success("Chamado aberto com sucesso.");
          router.push("/portal/tickets");
          router.refresh();
          return;
        }

        toast.error(result.message || "Erro ao criar chamado.");
      } catch {
        toast.error("Erro inesperado ao criar chamado.");
      }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 space-y-5 pb-8 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-2 h-8 gap-2 text-muted-foreground" onClick={() => router.push("/portal/tickets")}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Novo chamado</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Registre uma solicitacao com classificacao, contexto tecnico e evidencias.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canSubmit) {
              event.preventDefault();
              void form.handleSubmit(handleFormSubmit)();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFile(false);
            appendFiles(Array.from(event.dataTransfer.files));
          }}
          className={cn("grid gap-5 rounded-xl transition-colors xl:grid-cols-[minmax(0,1fr)_25rem]", isDraggingFile && "bg-primary/5")}
        >
          <section className="min-w-0 space-y-5">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-5 p-4 md:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Erro ao emitir nota fiscal"
                            className="h-10 border-border/60 bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 border-border/60 bg-background">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ticketSettings.priorities.map((priority) => (
                              <PrioritySelectItem key={priority.id} priority={priority} />
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasInternalTicketAccess && (
                  <div className="space-y-2">
                    <Label>Empresa / contato</Label>
                    <TicketCompanyPicker
                      value={selectedCompanyId || customerEmail ? (customerEmail ? `${selectedCompanyId}::${customerEmail}` : `${selectedCompanyId}::`) : ""}
                      options={internalCompanyOptions}
                      onChange={(value) => {
                        const [companyId, email] = value.split("::");
                        let option = customerOptions.find((item) => item.companyId === companyId && (email ? item.email === email : true));
                        if (!option && companyId === selectedCompanyId && email === customerEmail) {
                          option = { companyId, email, companyName: customerCompany || "", contactName: "" };
                        }
                        setSelectedCompanyId(companyId || "");
                        setCustomerEmail(option?.email || email || "");
                        setCustomerCompany(option?.companyName || null);
                      }}
                      onSearch={setSearchQuery}
                      loading={isCustomerOptionsLoading}
                      placeholder="Pesquisar ou selecionar empresa"
                      emptyMessage={customerOptionsError || "Nenhum resultado encontrado."}
                      className="h-10 border-border/60 bg-background"
                    />
                    {(customerEmail && customerCompany) || selectedCompanyId ? (
                      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                        <p className="font-medium text-foreground">{customerCompany || "Empresa vinculada ao ticket"}</p>
                        {selectedInternalCompanyOption?.legalName ? <p className="text-muted-foreground">{selectedInternalCompanyOption.legalName}</p> : null}
                        {customerEmail ? <p className="text-muted-foreground">{customerEmail}</p> : null}
                      </div>
                    ) : null}
                    {source === "chatwoot" && !selectedCompanyId ? (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        Tickets originados do Chatwoot so podem ser abertos quando o contato estiver vinculado a uma empresa no portal.
                      </div>
                    ) : null}
                  </div>
                )}

                {source === "chatwoot" && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-sm">
                    <p className="font-medium text-foreground">Criacao vinculada ao Chatwoot</p>
                    <p className="mt-1 text-muted-foreground">
                      Este ticket sera criado a partir do atendimento atual e mantera o vinculo com a conversa importada.
                    </p>
                    {(customerName || customerWhatsapp || customerPhone) && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {customerName ? <p>Contato: <span className="font-medium text-foreground">{customerName}</span></p> : null}
                        {customerWhatsapp ? <p>WhatsApp: <span className="font-mono text-foreground">{customerWhatsapp}</span></p> : null}
                        {!customerWhatsapp && customerPhone ? <p>Telefone: <span className="font-mono text-foreground">{customerPhone}</span></p> : null}
                      </div>
                    )}
                  </div>
                )}

                {!hasInternalTicketAccess && clientCompanies.length > 1 && (
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <TicketCompanyPicker
                      value={selectedCompanyId}
                      options={clientCompanyOptions}
                      onChange={setSelectedCompanyId}
                      placeholder="Selecione a empresa"
                      searchPlaceholder="Buscar empresa vinculada"
                      className="h-10 border-border/60 bg-background"
                    />
                  </div>
                )}

                {!hasInternalTicketAccess && clientCompanies.length === 1 && (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {selectedClientCompany?.name || clientCompanies[0].name}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Descricao detalhada</Label>
                  </div>
                  <TicketRichTextEditor
                    value={descriptionMarkdown}
                    onChange={setDescriptionMarkdown}
                    onPaste={handleDescriptionPaste}
                    placeholder="Informe o passo a passo, resultado esperado, mensagens de erro, ambiente e usuarios afetados."
                    className="ticket-create-editor"
                    minHeightClassName="min-h-80"
                  />
                  {form.formState.errors.description ? (
                    <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.description.message}</p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Minimo de 20 caracteres. Markdown suportado para listas, codigo e links.
                    </p>
                  )}
                  <TicketAttachmentField
                    files={files}
                    inputRef={fileInputRef}
                    onChange={handleFileChange}
                    onRemove={removeFile}
                    accept={TICKET_ATTACHMENT_ACCEPT_ATTRIBUTE}
                  />
                </div>

                {hasInternalTicketAccess && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">Contexto tecnico</h2>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="databaseUrl">Link da base de dados</Label>
                        <Input
                          id="databaseUrl"
                          value={databaseUrl}
                          onChange={(event) => setDatabaseUrl(event.target.value)}
                          placeholder="URL ou caminho interno"
                          className="h-10 border-border/60 bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="developmentVideoUrl">Video explicativo</Label>
                        <Input
                          id="developmentVideoUrl"
                          value={developmentVideoUrl}
                          onChange={(event) => setDevelopmentVideoUrl(event.target.value)}
                          placeholder="Loom, YouTube, Drive"
                          className="h-10 border-border/60 bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card className="relative overflow-hidden border-border/60 bg-card/95 shadow-sm">
              <div className="absolute left-0 top-0 h-0.5 w-full bg-linear-to-r from-transparent via-primary/40 to-transparent" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Tags className="h-3.5 w-3.5 text-primary/70" />
                  Informacoes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classificacao</p>
                  <p className="mt-1 text-xs text-muted-foreground">Define fila, categoria e roteamento inicial do chamado.</p>
                </div>

                {hasInternalTicketAccess ? (
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Equipe atual</Label>
                    <Select value={selectedTeam} onValueChange={handleTeamChange}>
                      <SelectTrigger className="h-10 border-border/60 bg-background">
                        <SelectValue placeholder="Selecione a equipe" />
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
                ) : (
                  <TeamPanel team={selectedTeam} label={getTeamLabel(ticketSettings, selectedTeam)} />
                )}

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-10 border-border/60 bg-background">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modulo</Label>
                <TicketModuleCascadeSelect
                  options={ticketSettings.modules}
                  value={selectedModule}
                  onChange={setSelectedModule}
                  mode="single"
                  compact
                  labels={{
                    single: "Modulo, submodulo e tela",
                  }}
                />
                </div>

              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => router.push("/portal/tickets")}>
                <ArrowLeft className="h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit} className="h-10 gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isPending ? "Enviando" : "Abrir chamado"}
              </Button>
            </div>
          </aside>
        </form>
      </Form>
    </div>
  );
}

function PrioritySelectItem({ priority }: { priority: TicketModuleSettingsPriority }) {
  return (
    <SelectItem value={priority.value}>
      <span className="inline-flex items-center gap-2">{priority.label}</span>
    </SelectItem>
  );
}

function TeamPanel({ team, label }: { team: string; label: string }) {
  const isDev = team === "DESENVOLVIMENTO";
  const Icon = isDev ? Code2 : Headphones;

  return (
    <div className={cn("rounded-md border px-3 py-2 text-sm", isDev ? "border-violet-500/30 bg-violet-500/10" : "border-sky-500/30 bg-sky-500/10")}>
      <span className={cn("inline-flex items-center gap-2 font-semibold", isDev ? "text-violet-700 dark:text-violet-300" : "text-sky-700 dark:text-sky-300")}>
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <p className="mt-1 text-xs text-muted-foreground">Chamados de cliente entram primeiro no suporte.</p>
    </div>
  );
}
