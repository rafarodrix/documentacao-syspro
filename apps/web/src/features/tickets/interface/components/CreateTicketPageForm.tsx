"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Code2,
  Headphones,
  Loader2,
  Paperclip,
  Send,
  Tags,
  X,
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
import {
  TicketCompanyPicker,
  type TicketCompanyPickerOption,
} from "@/features/tickets/interface/components/TicketCompanyPicker";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/TicketModuleCascadeSelect";

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

type TicketTeam = "SUPORTE" | "DESENVOLVIMENTO";

function stripHtml(value: string) {
  return value.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim();
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getTeamLabel(settings: TicketModuleSettings, team: string) {
  return settings.teams.find((item) => item.value === team)?.label || (team === "DESENVOLVIMENTO" ? "Desenvolvimento" : "Suporte");
}

function normalizeTicketTeam(value: string): TicketTeam {
  return value === "DESENVOLVIMENTO" ? "DESENVOLVIMENTO" : "SUPORTE";
}

export function CreateTicketPageForm({ isSystemUser }: CreateTicketPageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
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
  const [selectedTeam, setSelectedTeam] = useState<TicketTeam>(isSystemUser ? DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam : "SUPORTE");
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
  const descriptionText = stripHtml(descriptionHtml);
  const selectedClientCompany = clientCompanies.find((company) => company.id === selectedCompanyId) ?? null;

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

  const canSubmit =
    companyRequirementMet &&
    watchedSubject.trim().length >= 5 &&
    descriptionText.length >= 20 &&
    Boolean(selectedTeam && selectedCategory && selectedModule) &&
    !isPending;

  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
        if (!active || !json.success || !json.data) return;

        const nextSettings = json.data;
        const nextTeam: TicketTeam = isSystemUser ? nextSettings.defaultTeam : "SUPORTE";
        const nextCategory = nextSettings.categories.find((item) => item.defaultTeam === nextTeam)?.value || nextSettings.categories[0]?.value || "incident";

        setTicketSettings(nextSettings);
        setSelectedTeam(nextTeam);
        setSelectedCategory(nextCategory);
        setSelectedModule(nextSettings.modules[0]?.value || "");
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

  const appendFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;
    const totalSize = [...files, ...newFiles].reduce((acc, file) => acc + file.size, 0);

    if (totalSize > 5 * 1024 * 1024) {
      toast.error("O tamanho total dos arquivos nao pode exceder 5 MB.");
      return;
    }

    setFiles((current) => [...current, ...newFiles]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    appendFiles(Array.from(event.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleTeamChange = (value: string) => {
    const team = normalizeTicketTeam(value);
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Descricao detalhada</Label>
                    <div className="flex items-center gap-2">
                      {files.length > 0 ? (
                        <span className="text-xs text-muted-foreground">{files.length} anexo(s)</span>
                      ) : null}
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} title="Anexar evidencias">
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
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
                  <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.json,.log" onChange={handleFileChange} />
                  {form.formState.errors.description ? (
                    <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.description.message}</p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Minimo de 20 caracteres. Evite dados sensiveis quando anexar evidencias.
                    </p>
                  )}
                  <AttachmentChips files={files} onRemove={removeFile} />
                </div>

                {isSystemUser && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">Contexto tecnico</h2>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => fileInputRef.current?.click()} title="Anexar evidencia tecnica">
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
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

function AttachmentChips({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (!files.length) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {files.map((file, index) => (
        <div key={`${file.name}:${file.size}:${index}`} className="flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs">
          <Paperclip className="h-3 w-3 shrink-0 text-primary" />
          <span className="max-w-44 truncate font-medium text-foreground">{file.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatFileSize(file.size)}</span>
          <button type="button" className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-destructive" onClick={() => onRemove(index)}>
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
