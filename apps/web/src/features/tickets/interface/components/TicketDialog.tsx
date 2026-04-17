"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTicketDialog } from "@/features/tickets/interface/hooks/use-ticket-dialog";
import {
  PlusCircle,
  Loader2,
  Send,
  FileText,
  AlertCircle,
  MessageSquare,
  HelpCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TicketAttachmentField } from "@/features/tickets/interface/components/TicketAttachmentField";
import { TicketCompanyPicker, type TicketCompanyPickerOption } from "@/features/tickets/interface/components/TicketCompanyPicker";
import { cn } from "@/lib/utils";

interface TicketDialogProps {
  isSystemUser?: boolean;
}

export function TicketDialog({ isSystemUser = false }: TicketDialogProps) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const diagPrefix = "[TicketsDiag][TicketDialog]";

  const logInfo = (event: string, payload?: Record<string, unknown>) => {
    console.info(diagPrefix, { event, at: new Date().toISOString(), isSystemUser, ...payload });
  };

  const logError = (event: string, error: unknown, payload?: Record<string, unknown>) => {
    const normalized = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    console.error(diagPrefix, { event, at: new Date().toISOString(), isSystemUser, ...payload, error: normalized });
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
    isCustomerOptionsLoading,
    clientCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    ticketSettings,
    selectedCategory,
    setSelectedCategory,
    selectedModule,
    setSelectedModule,
    selectedEnvironment,
    setSelectedEnvironment,
    selectedTeam,
    setSelectedTeam,
    databaseUrl,
    setDatabaseUrl,
    developmentVideoUrl,
    setDevelopmentVideoUrl,
  } = useTicketDialog(() => setOpen(false), { isSystemUser });

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
  }, [form, searchParams, setCustomerCompany, setCustomerEmail]);

  const source = searchParams?.get("source") || "";
  const chatwootConversationId = searchParams?.get("chatwootConversationId") || "";
  const chatwootContactId = searchParams?.get("chatwootContactId") || "";
  const chatwootAccountId = searchParams?.get("chatwootAccountId") || "";
  const chatwootConversationUrl = searchParams?.get("chatwootConversationUrl") || "";
  const customerName = searchParams?.get("customerName") || "";
  const customerPhone = searchParams?.get("customerPhone") || "";
  const customerWhatsapp = searchParams?.get("customerWhatsapp") || "";

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        try {
          logInfo("dialog.open_change", { nextOpen });
          setOpen(nextOpen);
          if (!nextOpen && searchParams?.get("novo") === "1") {
            clearNewTicketParams();
          }
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
                    if (!isSystemUser && clientCompanies.length > 1 && !selectedCompanyId) {
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
                    render={({ field }) => (
                      <FormItem className="flex-1 flex flex-col">
                        <FormLabel className="flex justify-between w-full">
                            Detalhamento Técnico
                            <span className="text-xs font-normal text-muted-foreground flex gap-1 items-center"><Info className="w-3 h-3"/> Passo a Passo</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="1. Onde você estava?&#10;2. Em que tela clicou?&#10;3. O que esperava que acontecesse?&#10;4. Qual erro ocorreu no sistema?..." className="min-h-[280px] lg:h-full resize-none bg-white dark:bg-muted/30 focus:bg-background shadow-inner text-sm leading-relaxed" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <TicketAttachmentField
                    files={files}
                    inputRef={fileInputRef}
                    onChange={handleFileChange}
                    onRemove={removeFile}
                    accept="image/*,application/pdf"
                    compact
                  />
                  
                  {source === "chatwoot" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm mt-4">
                      <p className="font-medium text-foreground">Recebido via Omnichannel</p>
                      <p className="mt-1 text-muted-foreground">O chamado será vinculado automaticamente à conversa do Chatwoot atual.</p>
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

                  {isSystemUser && (
                    <FormItem className="space-y-3 bg-white dark:bg-background rounded-xl p-4 shadow-sm border border-border/60">
                      <Label className="flex justify-between items-center text-[13px] font-semibold">
                          Cliente Solicitante <span className="p-1 bg-yellow-500/10 text-yellow-600 rounded text-[10px]">Restrito a Agentes</span>
                      </Label>
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
                        onSearch={setSearchQuery}
                        loading={isCustomerOptionsLoading}
                        placeholder="Pesquisar por Contatos ou Empresa..."
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

                  {!isSystemUser && clientCompanies.length > 1 && (
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
                          const availableCats = ticketSettings.categories.filter((c) => c.defaultTeam === val);
                          if (availableCats.length > 0 && !availableCats.find(c => c.value === selectedCategory)) {
                             setSelectedCategory(availableCats[0].value);
                          }
                      }} disabled={!isSystemUser}>
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
                      <Select value={selectedModule} onValueChange={setSelectedModule}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-muted/30 shadow-sm h-10 border-border/60">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.modules.map((m) => (
                            <SelectItem key={m.id} value={m.value} className="text-sm">{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  </div>

                  <FormItem>
                      <Label className="text-xs">Ambiente/Produção</Label>
                      <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-muted/30 shadow-sm h-10 border-border/60">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.environments.map((environment) => (
                            <SelectItem key={environment.id} value={environment.value} className="text-sm">{environment.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>

                  {isSystemUser && (
                    <div className="space-y-4 pt-6 mt-2 border-t border-dashed border-border/60">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                        <Loader2 className="w-3 h-3" /> Integrações e Debug
                      </div>
                      <FormItem>
                        <Label className="text-xs">URL da Base de Dados</Label>
                        <Input
                          value={databaseUrl}
                          onChange={(event) => setDatabaseUrl(event.target.value)}
                          placeholder="https://console.pve... ou IP SSH"
                          className="bg-white dark:bg-muted/30 border-border/60 text-xs"
                        />
                      </FormItem>
                      <FormItem>
                        <Label className="text-xs">Gravação de Erro (Loom/Youtube)</Label>
                        <Input
                          value={developmentVideoUrl}
                          onChange={(event) => setDevelopmentVideoUrl(event.target.value)}
                          placeholder="https://www.loom.com/share/..."
                          className="bg-white dark:bg-muted/30 border-border/60 text-xs"
                        />
                      </FormItem>
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
              <a href="/docs/manual" target="_blank">
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
  );
}
