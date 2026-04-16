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
    searchQuery,
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

      <DialogContent className="w-[95vw] sm:max-w-3xl p-0 flex flex-col max-h-[90vh] overflow-hidden gap-0">
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

        <ScrollArea className="flex-1 overflow-y-auto w-full">
          <div className="p-6">
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
                className="space-y-6"
              >
                <input type="hidden" name="source" value={source} />
                <input type="hidden" name="chatwootConversationId" value={chatwootConversationId} />
                <input type="hidden" name="chatwootContactId" value={chatwootContactId} />
                <input type="hidden" name="chatwootAccountId" value={chatwootAccountId} />
                <input type="hidden" name="chatwootConversationUrl" value={chatwootConversationUrl} />
                <input type="hidden" name="customerName" value={customerName} />
                <input type="hidden" name="customerPhone" value={customerPhone} />
                <input type="hidden" name="customerWhatsapp" value={customerWhatsapp} />

                {source === "chatwoot" && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                    <p className="font-medium text-foreground">Ticket criado a partir de um atendimento do Chatwoot.</p>
                    <p className="mt-1 text-muted-foreground">O chamado sera salvo com o vinculo da conversa para rastreabilidade.</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit border border-primary/10">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Informacoes Basicas</span>
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Erro ao emitir Nota Fiscal..." className="bg-muted/30 focus:bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isSystemUser && (
                    <FormItem>
                      <Label>Empresa / contato</Label>
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
                        placeholder="Buscar empresa cadastrada, contato ou e-mail..."
                        searchPlaceholder="Digite empresa, contato, CNPJ ou e-mail..."
                        emptyMessage={isCustomerOptionsLoading ? "Buscando..." : "Nenhuma empresa encontrada."}
                        className="bg-muted/30 hover:bg-muted/40"
                      />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Refinar busca por empresa, contato, CNPJ ou e-mail..."
                        className="bg-background"
                      />
                      <p className="text-[0.8rem] text-muted-foreground">Busca empresas cadastradas no modulo Empresas e contatos vinculados.</p>
                      {(customerCompany || customerEmail || selectedCompanyId) ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                          <p className="font-medium text-foreground">{customerCompany || "Empresa selecionada"}</p>
                          {customerEmail ? <p className="text-muted-foreground">{customerEmail}</p> : null}
                        </div>
                      ) : null}
                    </FormItem>
                  )}

                  {!isSystemUser && clientCompanies.length > 1 && (
                    <FormItem>
                      <Label>Empresa (Vinculo)</Label>
                      <TicketCompanyPicker
                        value={selectedCompanyId}
                        options={clientCompanyOptions}
                        onChange={setSelectedCompanyId}
                        placeholder="Selecione a empresa"
                        searchPlaceholder="Buscar empresa vinculada..."
                        className="bg-muted/30"
                      />
                      <p className="text-[0.8rem] text-muted-foreground">Selecione para qual empresa deseja abrir o chamado.</p>
                    </FormItem>
                  )}
                  {!isSystemUser && clientCompanies.length === 1 && <p className="text-xs text-muted-foreground">Empresa vinculada: {clientCompanies[0].name}</p>}

                  {isSystemUser ? (
                    <FormItem>
                      <Label>Setor atual</Label>
                      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.teams.map((team) => (
                            <SelectItem key={team.id} value={team.value}>
                              {team.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[0.8rem] text-muted-foreground">Clientes entram primeiro pelo suporte. Desenvolvimento fica restrito a usuarios internos.</p>
                    </FormItem>
                  ) : (
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                      <p className="font-medium text-foreground">Setor atual: Suporte</p>
                      <p className="mt-1 text-xs text-muted-foreground">Chamados de clientes entram primeiro na triagem do suporte.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormItem>
                      <Label>Categoria</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={(value) => {
                          setSelectedCategory(value);
                          const category = ticketSettings.categories.find((item) => item.value === value);
                          setSelectedTeam(isSystemUser ? category?.defaultTeam || selectedTeam : "SUPORTE");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.categories.map((category) => (
                            <SelectItem key={category.id} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="incident">Incidente / Erro</SelectItem>
                              <SelectItem value="question">Duvida</SelectItem>
                              <SelectItem value="request">Solicitacao</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1 low">Baixa</SelectItem>
                              <SelectItem value="2 normal">Normal</SelectItem>
                              <SelectItem value="3 high">Alta (Urgente)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormItem>
                      <Label>Modulo</Label>
                      <Select value={selectedModule} onValueChange={setSelectedModule}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.modules.map((moduleOption) => (
                            <SelectItem key={moduleOption.id} value={moduleOption.value}>
                              {moduleOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>

                    <FormItem>
                      <Label>Ambiente</Label>
                      <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ticketSettings.environments.map((environment) => (
                            <SelectItem key={environment.id} value={environment.value}>
                              {environment.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  </div>

                  {isSystemUser && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormItem>
                        <Label>Link da base de dados</Label>
                        <Input
                          value={databaseUrl}
                          onChange={(event) => setDatabaseUrl(event.target.value)}
                          placeholder="https://... ou caminho interno"
                          className="bg-muted/30"
                        />
                      </FormItem>
                      <FormItem>
                        <Label>Video explicativo dev</Label>
                        <Input
                          value={developmentVideoUrl}
                          onChange={(event) => setDevelopmentVideoUrl(event.target.value)}
                          placeholder="https://www.loom.com/... ou YouTube"
                          className="bg-muted/30"
                        />
                      </FormItem>
                    </div>
                  )}

                </div>

                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit border border-primary/10">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Detalhamento</span>
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descricao</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva o passo a passo..." className="min-h-32 resize-y bg-muted/30 focus:bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                        <FormDescription className="flex items-center gap-1 text-xs">
                          <Info className="h-3 w-3" /> Quanto mais detalhes, melhor.
                        </FormDescription>
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
