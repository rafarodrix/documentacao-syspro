"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTicketDialog } from "@/features/tickets/interface/hooks/use-ticket-dialog";
import {
  PlusCircle,
  Loader2,
  Send,
  FileText,
  AlertCircle,
  Building2,
  Code2,
  Headphones,
  MessageSquare,
  HelpCircle,
  Info,
} from "lucide-react";
import { Button, Input, Label, ScrollArea, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@dosc-syspro/ui";
import { toast } from "sonner";
import { TicketAttachmentField } from "@/features/tickets/interface/components/ticket-attachment-field";
import { TicketCompanyPicker, type TicketCompanyPickerOption } from "@/features/tickets/interface/components/ticket-company-picker";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/ticket-module-cascade-select";
import { TicketRichTextEditor } from "@/features/tickets/interface/components/ticket-rich-text-editor";
import { normalizeTicketMarkdownInput } from "@/features/tickets/lib/ticket-markdown";
import { cn } from "@/lib/utils";

interface TicketDialogProps {
  hasInternalTicketAccess?: boolean;
}

export function TicketDialog({ hasInternalTicketAccess = false }: TicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const diagPrefix = "[TicketsDiag][TicketDialog]";

  const logInfo = (event: string, payload?: Record<string, unknown>) => {
    console.info(diagPrefix, { event, at: new Date().toISOString(), hasInternalTicketAccess, ...payload });
  };

  const logError = (event: string, error: unknown, payload?: Record<string, unknown>) => {
    const normalized = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    console.error(diagPrefix, { event, at: new Date().toISOString(), hasInternalTicketAccess, ...payload, error: normalized });
  };

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      logError("window.error", event.error ?? event.message, { filename: event.filename, lineno: event.lineno, colno: event.colno, open });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("window.unhandled_rejection", event.reason, { open });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const {
    form,
    files,
    isPending,
    fileInputRef,
    handleFileChange,
    removeFile,
    onSubmit,
    customerEmail,
    setCustomerEmail,
    customerCompany,
    setCustomerCompany,
    setSearchQuery,
    customerOptions,
    customerOptionsError,
    isCustomerOptionsLoading,
    clientCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    ticketSettings,
    selectedCategory,
    setSelectedCategory,
    selectedModule,
    setSelectedModule,
    selectedTeam,
    setSelectedTeam,
    descriptionMarkdown,
    setDescriptionMarkdown,
    databaseUrl,
    setDatabaseUrl,
    developmentVideoUrl,
    setDevelopmentVideoUrl,
    handleDescriptionPaste,
    attachmentAccept,
  } = useTicketDialog(() => setOpen(false), { hasInternalTicketAccess });

  const internalCompanyOptions: TicketCompanyPickerOption[] = useMemo(() => {
    const opts: TicketCompanyPickerOption[] = [];
    const usedIds = new Set<string>();

    for (const option of customerOptions) {
      let id = option.email ? `${option.companyId}::${option.email}` : `${option.companyId}::`;
      if (usedIds.has(id)) {
        id = `${id}::${option.contactName || option.companyName}`;
      }
      usedIds.add(id);

      opts.push({
        id,
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

  useEffect(() => {
    const shouldOpen = searchParams?.get("novo") === "1";
    if (!shouldOpen) return;

    const source = searchParams?.get("source") || "";
    const subject = searchParams?.get("subject") || "";
    const description = searchParams?.get("description") || "";
    const priority = searchParams?.get("priority") || "";
    const customerEmailParam = searchParams?.get("customerEmail") || "";
    const customerCompanyParam = searchParams?.get("customerCompany") || "";

    form.reset({
      subject: subject || form.getValues("subject"),
      description: description || form.getValues("description"),
      type: form.getValues("type"),
      priority: priority || form.getValues("priority"),
    });
    setDescriptionMarkdown(normalizeTicketMarkdownInput(description));

    if (customerEmailParam) {
      setCustomerEmail(customerEmailParam.trim().toLowerCase());
    }
    if (customerCompanyParam) {
      setCustomerCompany(customerCompanyParam.trim());
    }

    logInfo("dialog.prefill_from_query", {
      source,
      hasSubject: Boolean(subject),
      hasDescription: Boolean(description),
      hasCustomerEmail: Boolean(customerEmailParam),
    });
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, searchParams, setCustomerCompany, setCustomerEmail, setDescriptionMarkdown]);

  const source = searchParams?.get("source") || "";
  const chatwootConversationId = searchParams?.get("chatwootConversationId") || "";
  const chatwootContactId = searchParams?.get("chatwootContactId") || "";
  const chatwootAccountId = searchParams?.get("chatwootAccountId") || "";
  const chatwootConversationUrl = searchParams?.get("chatwootConversationUrl") || "";
  const customerName = searchParams?.get("customerName") || "";
  const customerPhone = searchParams?.get("customerPhone") || "";
  const customerWhatsapp = searchParams?.get("customerWhatsapp") || "";
  const showTechnicalContext = hasInternalTicketAccess || source === "chatwoot";

  const clearNewTicketParams = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    [
      "novo",
      "source",
      "subject",
      "description",
      "priority",
      "customerEmail",
      "customerCompany",
      "chatwootConversationId",
      "chatwootContactId",
      "chatwootAccountId",
      "chatwootConversationUrl",
      "customerName",
      "customerPhone",
      "customerWhatsapp",
    ].forEach((key) => params.delete(key));

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        try {
          logInfo("dialog.open_change", { nextOpen });
          if (!nextOpen) {
            const isDirty =
              form.formState.isDirty ||
              descriptionMarkdown.trim().length > 0 ||
              files.length > 0;
            if (isDirty) {
              setPendingClose(true);
              return;
            }
            if (searchParams?.get("novo") === "1") clearNewTicketParams();
          }
          setOpen(nextOpen);
        } catch (error) {
          logError("dialog.open_change_failed", error, { nextOpen });
          toast.error("Falha ao abrir o formulario de chamado.");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="h-10 w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-linear-to-r from-primary to-primary/90 gap-2 sm:w-auto"
          onClick={() => logInfo("dialog.trigger_click", { openBeforeClick: open })}
        >
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Abrir Novo Chamado</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[98vw] sm:max-w-6xl p-0 flex flex-col max-h-[90vh] h-[85vh] overflow-hidden gap-0 shadow-2xl border-primary/20">
        <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
              Nova Solicitacao
            </DialogTitle>
            <DialogDescription>Descreva seu problema ou duvida detalhadamente.</DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 w-full bg-background/50">
          <div className="p-0">
            <Form {...form}>
              <form
                id="ticket-form"
                onSubmit={(event) => {
                  logInfo("dialog.submit_start", { filesCount: files.length });
                  try {
                    if (!hasInternalTicketAccess && clientCompanies.length > 1 && !selectedCompanyId) {
                      toast.error("Selecione para qual empresa o chamado esta sendo aberto.");
                      event.preventDefault();
                      return;
                    }
                    onSubmit(event);
                  } catch (error) {
                    logError("dialog.submit_sync_throw", error, { filesCount: files.length });
                    toast.error("Falha ao iniciar o envio do chamado.");
                  }
                }}
                className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-0 min-h-full"
              >
                <div className="p-6 lg:p-8 space-y-6 lg:border-r border-border/40">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-md w-fit border border-primary/20">
                        <FileText className="h-4 w-4" />
                        <span>Resumo do chamado</span>
                      </div>
                      <div className="hidden lg:block text-xs text-muted-foreground mr-2 opacity-70">Passo 1 de 2</div>
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Qual o problema ou solicitação?</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Erro ao emitir Nota Fiscal na empresa matriz..." className="h-12 bg-white dark:bg-muted/30 focus:bg-background text-base shadow-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={() => {
                      const charCount = descriptionMarkdown.trim().length;
                      const MIN_CHARS = 20;
                      return (
                        <FormItem className="flex-1 flex flex-col">
                          <FormLabel className="flex justify-between w-full">
                            Detalhamento Técnico
                            <span className="text-xs font-normal text-muted-foreground flex gap-1 items-center"><Info className="w-3 h-3"/> Passo a Passo</span>
                          </FormLabel>
                          <FormControl>
                            <TicketRichTextEditor
                              value={descriptionMarkdown}
                              onChange={setDescriptionMarkdown}
                              onPaste={handleDescriptionPaste}
                              placeholder="Descreva o passo a passo, resultado esperado, mensagens de erro, impacto e evidencias relevantes."
                              className="bg-white dark:bg-muted/30"
                              minHeightClassName="min-h-[280px]"
                            />
                          </FormControl>
                          <div className="flex items-center justify-between mt-1">
                            <FormMessage />
                            <span className={cn(
                              "ml-auto text-[11px] tabular-nums transition-colors",
                              charCount === 0
                                ? "text-muted-foreground/50"
                                : charCount < MIN_CHARS
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                            )}>
                              {charCount < MIN_CHARS && charCount > 0
                                ? `${MIN_CHARS - charCount} caracteres restantes`
                                : `${charCount} caracteres`}
                            </span>
                          </div>
                        </FormItem>
                      );
                    }}
                  />

                  <TicketAttachmentField
                    files={files}
                    inputRef={fileInputRef}
                    onChange={handleFileChange}
                    onRemove={removeFile}
                    accept={attachmentAccept}
                    compact
                  />
                  
                  {source === "chatwoot" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm mt-4 space-y-3">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Headphones className="h-4 w-4 text-primary" />
                        Recebido via Omnichannel
                      </div>
                      <p className="text-muted-foreground">O chamado sera vinculado automaticamente a conversa atual do Chatwoot.</p>
                      {(customerName || customerWhatsapp || customerPhone) ? (
                        <div className="grid gap-2 rounded-lg border border-primary/10 bg-background/70 px-3 py-2 text-xs">
                          {customerName ? (
                            <p className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">{customerName}</span>
                            </p>
                          ) : null}
                          {customerWhatsapp ? <p>WhatsApp: <span className="font-mono text-foreground">{customerWhatsapp}</span></p> : null}
                          {!customerWhatsapp && customerPhone ? <p>Telefone: <span className="font-mono text-foreground">{customerPhone}</span></p> : null}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <input type="hidden" name="source" value={source} />
                  <input type="hidden" name="chatwootConversationId" value={chatwootConversationId} />
                  <input type="hidden" name="chatwootContactId" value={chatwootContactId} />
                  <input type="hidden" name="chatwootAccountId" value={chatwootAccountId} />
                  <input type="hidden" name="chatwootConversationUrl" value={chatwootConversationUrl} />
                  <input type="hidden" name="customerName" value={customerName} />
                  <input type="hidden" name="customerPhone" value={customerPhone} />
                  <input type="hidden" name="customerWhatsapp" value={customerWhatsapp} />
                </div>

                <div className="p-6 lg:p-8 space-y-6 bg-muted/5 sm:bg-transparent flex flex-col h-full">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider bg-muted p-2 rounded-md w-fit border border-border/40">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Atribuição e SLA</span>
                      </div>
                      <div className="hidden lg:block text-xs text-muted-foreground opacity-70">Passo 2 de 2</div>
                  </div>

                  {hasInternalTicketAccess && (
                    <FormItem className="space-y-3 bg-white dark:bg-background rounded-xl p-4 shadow-sm border border-border/60">
                      <Label className="flex justify-between items-center text-[13px] font-semibold">
                          Cliente Solicitante <span className="p-1 bg-yellow-500/10 text-yellow-600 rounded text-[10px]">Restrito a Agentes</span>
                      </Label>
                      <TicketCompanyPicker
                        value={selectedCompanyId || customerEmail ? (customerEmail ? `${selectedCompanyId}::${customerEmail}` : `${selectedCompanyId}::`) : ""}
                        options={internalCompanyOptions}
                        onChange={(value) => {
                          const [companyId, email] = value.split("::");
                          const option = customerOptions.find((item) => item.companyId === companyId && (email ? item.email === email : true));
                          setSelectedCompanyId(companyId || "");
                          setCustomerEmail(option?.email || email || "");
                          setCustomerCompany(option?.companyName || null);
                        }}
                        onSearch={setSearchQuery}
                        loading={isCustomerOptionsLoading}
                        placeholder="Pesquisar por Contatos ou Empresa..."
                        emptyMessage={customerOptionsError || "Nenhum resultado encontrado."}
                        className="bg-muted/10 h-10 border-border/60 hover:bg-muted/20 hover:border-primary/40 focus:border-primary transition-all shadow-none"
                      />
                      {(customerCompany || customerEmail || selectedCompanyId) ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs animate-in slide-in-from-top-1">
                          <p className="font-semibold text-foreground text-[13px]">{customerCompany || "Empresa selecionada"}</p>
                          {customerEmail ? <p className="text-muted-foreground mt-0.5">{customerEmail}</p> : null}
                        </div>
                      ) : null}
                    </FormItem>
                  )}

                  {!hasInternalTicketAccess && clientCompanies.length > 1 && (
                    <FormItem>
                      <Label>Qual das suas empresas matriz/filial?</Label>
                      <TicketCompanyPicker
                        value={selectedCompanyId}
                        options={clientCompanyOptions}
                        onChange={setSelectedCompanyId}
                        placeholder="Selecione a empresa associada..."
                        className="bg-white dark:bg-muted/30 shadow-sm"
                      />
                    </FormItem>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormItem>
                      <Label className="text-xs">Prioridade (SLA)</Label>
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-muted/30 shadow-sm h-10 border-border/60">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ticketSettings.priorities.map((p) => (
                                <SelectItem key={p.id} value={p.value} className="text-sm">
                                  <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", String(p.color).includes("red") ? "bg-red-500" : String(p.color).includes("blue") ? "bg-blue-500" : "bg-neutral-400")} />
                                      {p.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormItem>

                    <FormItem>
                      <Label className="text-xs">Categoria</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={(value) => {
                          setSelectedCategory(value);
                          form.setValue("type", "incident"); // fallthrough default type internal
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-muted/30 shadow-sm h-10 border-border/60">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.categories
                            .filter((category) => !selectedTeam || category.defaultTeam === selectedTeam)
                            .map((category) => (
                            <SelectItem key={category.id} value={category.value} className="text-sm">
                              {category.icon} {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    
                    <FormField control={form.control} name="type" render={({field}) => <FormItem className="hidden"><FormControl><Input {...field}/></FormControl></FormItem>} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormItem>
                      <Label className="text-xs">Roteado para:</Label>
                      <Select value={selectedTeam} onValueChange={(val) => {
                          setSelectedTeam(val);
                          const suggestedCategory = ticketSettings.categories.find((category) => category.defaultTeam === val)?.value;
                          if (suggestedCategory) {
                            setSelectedCategory(suggestedCategory);
                          }
                      }} disabled={!hasInternalTicketAccess}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-muted/30 shadow-sm h-10 border-border/60 disabled:opacity-70 disabled:bg-muted">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.teams.map((team) => (
                            <SelectItem key={team.id} value={team.value} className="text-sm">{team.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    
                    <FormItem>
                      <Label className="text-xs">Módulo (Local Erro)</Label>
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
                    </FormItem>
                  </div>


                  {showTechnicalContext && (
                    <div className="space-y-4 pt-6 mt-2 border-t border-dashed border-border/60">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                        <Code2 className="w-3 h-3" /> Contexto tecnico
                      </div>
                      <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm dark:bg-background">
                        <div className="mb-3 flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-semibold text-foreground">Recursos operacionais</p>
                        </div>
                        <div className="grid gap-4">
                          <FormItem>
                            <Label className="text-xs">Link da base de dados</Label>
                            <Input
                              value={databaseUrl}
                              onChange={(event) => setDatabaseUrl(event.target.value)}
                              placeholder="URL, console, host interno ou acesso da base"
                              className="bg-background border-border/60 text-xs"
                            />
                          </FormItem>
                          <FormItem>
                            <Label className="text-xs">Video explicativo</Label>
                            <Input
                              value={developmentVideoUrl}
                              onChange={(event) => setDevelopmentVideoUrl(event.target.value)}
                              placeholder="Loom, YouTube, Drive ou outra evidencia em video"
                              className="bg-background border-border/60 text-xs"
                            />
                          </FormItem>
                        </div>
                      </div>
                      {source === "chatwoot" ? (
                        <p className="text-[11px] text-muted-foreground">
                          Esses links ajudam o time tecnico mesmo quando o chamado nasce direto do atendimento.
                        </p>
                      ) : null}
                    </div>
                  )}

                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-border/40 bg-muted/10 shrink-0">
          <div className="flex flex-col sm:flex-row w-full items-center justify-between gap-4">
            <Button variant="link" className="text-xs text-muted-foreground h-auto p-0 hidden sm:flex gap-1" asChild>
              <a href="/portal/docs/cliente/documentacao" target="_blank">
                <HelpCircle className="h-3 w-3" /> Precisa de ajuda?
              </a>
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button type="submit" form="ticket-form" disabled={isPending} className="flex-1 sm:flex-none shadow-md min-w-[140px]">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Abrir Chamado
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={pendingClose} onOpenChange={setPendingClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar rascunho?</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem informações preenchidas neste formulário. Fechar agora irá descartar tudo. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingClose(false)}>
            Continuar editando
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setPendingClose(false);
              setOpen(false);
              form.reset();
              if (searchParams?.get("novo") === "1") clearNewTicketParams();
            }}
          >
            Descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
