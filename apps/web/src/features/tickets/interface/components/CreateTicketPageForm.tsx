"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDot,
  Code2,
  Database,
  Flame,
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
  ticketFormSchema,
  type TicketFormInput,
  type TicketFormOutput,
  type TicketModuleSettings,
  type TicketModuleSettingsPriority,
} from "@dosc-syspro/contracts/ticket";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createTicketAction, getUserLinkedCompaniesAction } from "@/features/tickets/application/ticket-actions";
import { TicketAttachmentField } from "@/features/tickets/interface/components/TicketAttachmentField";
import {
  TicketCompanyPicker,
  type TicketCompanyPickerOption,
} from "@/features/tickets/interface/components/TicketCompanyPicker";

import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="h-44 rounded-md border border-border/60 bg-muted/20" />,
});

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

const PRIORITY_ICONS = {
  "1 low": ArrowDown,
  "2 normal": CircleDot,
  "3 high": Flame,
} as const;

function stripHtml(value: string) {
  return value.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim();
}

function getPriorityTone(priority?: string) {
  if (priority === "1 low") return "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
  if (priority === "3 high") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function getTeamLabel(settings: TicketModuleSettings, team: string) {
  return settings.teams.find((item) => item.value === team)?.label || (team === "DESENVOLVIMENTO" ? "Desenvolvimento" : "Suporte");
}

function getPriorityLabel(settings: TicketModuleSettings, priority: string) {
  return settings.priorities.find((item) => item.value === priority)?.label || "Normal";
}

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
  const [customerOptionsError, setCustomerOptionsError] = useState<string | null>(null);
  const [clientCompanies, setClientCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [ticketSettings, setTicketSettings] = useState<TicketModuleSettings>(DEFAULT_TICKET_MODULE_SETTINGS);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_TICKET_MODULE_SETTINGS.categories[0]?.value ?? "incident");
  const [selectedModule, setSelectedModule] = useState(DEFAULT_TICKET_MODULE_SETTINGS.modules[0]?.value ?? "");
  const [selectedEnvironment, setSelectedEnvironment] = useState(DEFAULT_TICKET_MODULE_SETTINGS.defaultEnvironment);
  const [selectedTeam, setSelectedTeam] = useState(isSystemUser ? DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam : "SUPORTE");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [developmentVideoUrl, setDevelopmentVideoUrl] = useState("");

  const form = useForm<TicketFormInput, undefined, TicketFormOutput>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      type: "incident",
      description: "",
      priority: DEFAULT_TICKET_MODULE_SETTINGS.defaultPriority,
    },
  });

  const watchedSubject = form.watch("subject");
  const watchedPriority = form.watch("priority");
  const descriptionText = stripHtml(descriptionHtml);
  const selectedClientCompany = clientCompanies.find((company) => company.id === selectedCompanyId) ?? null;
  const selectedCategoryOption = ticketSettings.categories.find((item) => item.value === selectedCategory);
  const selectedModuleOption = ticketSettings.modules.find((item) => item.value === selectedModule);
  const selectedEnvironmentOption = ticketSettings.environments.find((item) => item.value === selectedEnvironment);

  const filteredCategories = useMemo(
    () => ticketSettings.categories.filter((category) => !selectedTeam || category.defaultTeam === selectedTeam),
    [selectedTeam, ticketSettings.categories],
  );

  const systemCompanyOptions: TicketCompanyPickerOption[] = useMemo(() => {
    const opts: TicketCompanyPickerOption[] = [];
    const usedIds = new Set<string>();

    for (const option of customerOptions) {
      let baseId = option.email ? `${option.companyId}::${option.email}` : `${option.companyId}::`;
      if (usedIds.has(baseId)) {
        baseId = `${baseId}::${option.contactName || option.companyName}`;
      }
      usedIds.add(baseId);

      opts.push({
        id: baseId,
        label: option.companyName,
        description: option.contactName || option.email,
        meta: option.contactName ? option.email : null,
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

  const companyRequirementMet = isSystemUser
    ? Boolean(selectedCompanyId || customerEmail.trim())
    : clientCompanies.length <= 1 || Boolean(selectedCompanyId);

  const readinessItems = [
    { label: "Identificacao", done: companyRequirementMet },
    { label: "Assunto", done: watchedSubject.trim().length >= 5 },
    { label: "Descricao", done: descriptionText.length >= 20 },
    { label: "Classificacao", done: Boolean(selectedTeam && selectedCategory && selectedModule && selectedEnvironment) },
  ];
  const completedItems = readinessItems.filter((item) => item.done).length;
  const progressPct = Math.round((completedItems / readinessItems.length) * 100);
  const canSubmit = completedItems === readinessItems.length && !isPending;

  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
        if (!active || !json.success || !json.data) return;

        const nextSettings = json.data;
        const nextTeam = isSystemUser ? nextSettings.defaultTeam : "SUPORTE";
        const nextCategory = nextSettings.categories.find((item) => item.defaultTeam === nextTeam)?.value || nextSettings.categories[0]?.value || "incident";

        setTicketSettings(nextSettings);
        setSelectedTeam(nextTeam);
        setSelectedCategory(nextCategory);
        setSelectedModule(nextSettings.modules[0]?.value || "");
        setSelectedEnvironment(nextSettings.defaultEnvironment);
        form.setValue("priority", nextSettings.defaultPriority, { shouldValidate: false });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [form, isSystemUser]);

  useEffect(() => {
    if (isSystemUser) return;

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
  }, [isSystemUser]);

  useEffect(() => {
    if (!isSystemUser) return;

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
  }, [searchQuery, isSystemUser]);

  useEffect(() => {
    form.setValue("description", descriptionText, { shouldValidate: descriptionText.length > 0 });
  }, [descriptionText, form]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const newFiles = Array.from(event.target.files);
    const totalSize = [...files, ...newFiles].reduce((acc, file) => acc + file.size, 0);

    if (totalSize > 5 * 1024 * 1024) {
      toast.error("O tamanho total dos arquivos nao pode exceder 5 MB.");
      return;
    }

    setFiles((current) => [...current, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleTeamChange = (team: string) => {
    setSelectedTeam(team);
    const availableCategories = ticketSettings.categories.filter((category) => category.defaultTeam === team);
    if (availableCategories.length > 0 && !availableCategories.some((category) => category.value === selectedCategory)) {
      setSelectedCategory(availableCategories[0].value);
    }
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    const category = ticketSettings.categories.find((item) => item.value === categoryValue);
    if (category?.defaultTeam) {
      setSelectedTeam(isSystemUser ? category.defaultTeam : "SUPORTE");
    }
  };

  const handleFormSubmit = (data: TicketFormOutput) => {
    if (!companyRequirementMet) {
      toast.error(isSystemUser ? "Selecione a empresa ou contato do cliente." : "Selecione a empresa do chamado.");
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
        formData.append("description", descriptionHtml || data.description);
        formData.append("priority", data.priority);
        formData.append("type", data.type);

        if (isSystemUser) {
          if (customerEmail.trim()) formData.append("customerEmail", customerEmail.trim().toLowerCase());
          if (selectedCompanyId) formData.append("companyId", selectedCompanyId);
        } else if (selectedCompanyId) {
          formData.append("userSelectedCompanyId", selectedCompanyId);
        }

        if (selectedCategory) formData.append("category", selectedCategory);
        if (selectedModule) formData.append("module", selectedModule);
        if (selectedEnvironment) formData.append("environment", selectedEnvironment);
        if (selectedTeam) formData.append("team", selectedTeam);
        if (databaseUrl.trim()) formData.append("databaseUrl", databaseUrl.trim());
        if (developmentVideoUrl.trim()) formData.append("developmentVideoUrl", developmentVideoUrl.trim());
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
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm sm:min-w-72">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preenchimento</span>
            <span className="text-sm font-semibold text-foreground">{progressPct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div className={cn("h-1.5 rounded-full transition-all", progressPct === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="space-y-5">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-5 p-4 md:p-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryBadge label="Equipe" value={getTeamLabel(ticketSettings, selectedTeam)} tone={selectedTeam === "DESENVOLVIMENTO" ? "dev" : "support"} />
                  <SummaryBadge label="Categoria" value={selectedCategoryOption?.label || "Nao definida"} />
                  <SummaryBadge label="Modulo" value={selectedModuleOption?.label || "Nao definido"} />
                </div>

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

                {isSystemUser && (
                  <div className="space-y-2">
                    <Label>Empresa / contato</Label>
                    <TicketCompanyPicker
                      value={selectedCompanyId || customerEmail ? (customerEmail ? `${selectedCompanyId}::${customerEmail}` : `${selectedCompanyId}::`) : ""}
                      options={systemCompanyOptions}
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
                        {customerEmail ? <p className="text-muted-foreground">{customerEmail}</p> : null}
                      </div>
                    ) : null}
                  </div>
                )}

                {!isSystemUser && clientCompanies.length > 1 && (
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

                {!isSystemUser && clientCompanies.length === 1 && (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {selectedClientCompany?.name || clientCompanies[0].name}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Descricao detalhada</Label>
                  <div className="overflow-hidden rounded-md border border-border/60 bg-background [&_.ql-container]:border-0 [&_.ql-editor]:min-h-44 [&_.ql-editor]:text-sm [&_.ql-editor.ql-blank::before]:text-muted-foreground/60 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border/60 [&_.ql-toolbar]:bg-muted/20">
                    <ReactQuill
                      theme="snow"
                      value={descriptionHtml}
                      onChange={setDescriptionHtml}
                      placeholder="Informe o passo a passo, resultado esperado, mensagens de erro e usuarios afetados."
                      modules={{
                        toolbar: [
                          ["bold", "italic", "underline"],
                          [{ list: "ordered" }, { list: "bullet" }],
                          ["blockquote", "code-block"],
                          ["clean"],
                        ],
                      }}
                    />
                  </div>
                  {form.formState.errors.description ? (
                    <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.description.message}</p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Minimo de 20 caracteres. Evite dados sensiveis quando anexar evidencias.
                    </p>
                  )}
                </div>

                {isSystemUser && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold text-foreground">Diagnostico tecnico</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="databaseUrl">Link da base de dados</Label>
                        <Input
                          id="databaseUrl"
                          value={databaseUrl}
                          onChange={(event) => setDatabaseUrl(event.target.value)}
                          placeholder="https://... ou caminho interno"
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

                <TicketAttachmentField
                  files={files}
                  inputRef={fileInputRef}
                  onChange={handleFileChange}
                  onRemove={removeFile}
                  compact
                />
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Tags className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Classificacao</h2>
                    <p className="text-xs text-muted-foreground">Define fila, SLA e roteamento inicial.</p>
                  </div>
                </div>

                {isSystemUser ? (
                  <div className="space-y-2">
                    <Label>Equipe atual</Label>
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
                  <Label>Categoria</Label>
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
                  <Label>Modulo</Label>
                  <Select value={selectedModule} onValueChange={setSelectedModule}>
                    <SelectTrigger className="h-10 border-border/60 bg-background">
                      <SelectValue placeholder="Selecione o modulo" />
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
                  <Label>Ambiente</Label>
                  <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                    <SelectTrigger className="h-10 border-border/60 bg-background">
                      <SelectValue placeholder="Selecione o ambiente" />
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
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Resumo operacional</h2>
                    <p className="text-xs text-muted-foreground">Conferencia antes do envio.</p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold", getPriorityTone(watchedPriority))}>
                    {getPriorityLabel(ticketSettings, watchedPriority)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {readinessItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={cn("inline-flex items-center gap-1 font-medium", item.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                        {item.done ? "Ok" : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <SummaryLine label="Equipe" value={getTeamLabel(ticketSettings, selectedTeam)} />
                    <SummaryLine label="Ambiente" value={selectedEnvironmentOption?.label || selectedEnvironment} />
                    <SummaryLine label="Categoria" value={selectedCategoryOption?.label || selectedCategory} />
                    <SummaryLine label="Modulo" value={selectedModuleOption?.label || selectedModule} />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:flex-col-reverse">
                  <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => router.push("/portal/tickets")}>
                    <ArrowLeft className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!canSubmit} className="h-10 gap-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isPending ? "Enviando" : "Abrir chamado"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </form>
      </Form>
    </div>
  );
}

function SummaryBadge({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "support" | "dev" }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-semibold", tone === "support" && "text-sky-600 dark:text-sky-300", tone === "dev" && "text-violet-600 dark:text-violet-300")}>{value}</p>
    </div>
  );
}

function PrioritySelectItem({ priority }: { priority: TicketModuleSettingsPriority }) {
  const Icon = PRIORITY_ICONS[priority.value as keyof typeof PRIORITY_ICONS] || CircleDot;

  return (
    <SelectItem value={priority.value}>
      <span className="inline-flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {priority.label}
      </span>
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

function SummaryLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium text-foreground">{value || "Nao definido"}</p>
    </div>
  );
}
