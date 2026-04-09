"use client";

import { useEffect, useState } from 'react';
import { useTicketSheet } from '@/features/tickets/interface/hooks';

import {
    PlusCircle, Loader2, Send, FileText, AlertCircle,
    Paperclip, X, MessageSquare, HelpCircle, Info, ChevronsUpDown, Building2, Check
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet, SheetContent, SheetDescription, SheetFooter,
    SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
    Form, FormControl, FormField, FormItem, FormLabel,
    FormMessage, FormDescription,
} from '@/components/ui/form';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TicketSheetProps {
    isSystemUser?: boolean;
}

export function TicketSheet({ isSystemUser = false }: TicketSheetProps) {
    const [open, setOpen] = useState(false);
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const diagPrefix = "[TicketsDiag][TicketSheet]";

    const logInfo = (event: string, payload?: Record<string, unknown>) => {
        console.info(diagPrefix, {
            event,
            at: new Date().toISOString(),
            isSystemUser,
            ...payload,
        });
    };

    const logError = (event: string, error: unknown, payload?: Record<string, unknown>) => {
        const normalized = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) };
        console.error(diagPrefix, {
            event,
            at: new Date().toISOString(),
            isSystemUser,
            ...payload,
            error: normalized,
        });
    };

    useEffect(() => {
        const onWindowError = (event: ErrorEvent) => {
            logError("window.error", event.error ?? event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                open,
            });
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
    }, [open]);

    // Toda a lÃ³gica vem do Hook
    const {
        form, files, isPending, fileInputRef,
        handleFileChange, removeFile, triggerFileInput, onSubmit,
        customerEmail, setCustomerEmail, customerCompany, setCustomerCompany, searchQuery, setSearchQuery, customerOptions, isCustomerOptionsLoading
    } = useTicketSheet(() => setOpen(false), { isSystemUser });

    return (
        <Sheet
            open={open}
            onOpenChange={(nextOpen) => {
                try {
                    logInfo("sheet.open_change", { nextOpen });
                    setOpen(nextOpen);
                } catch (error) {
                    logError("sheet.open_change_failed", error, { nextOpen });
                    throw error;
                }
            }}
        >
            <SheetTrigger asChild>
                <Button
                    className="h-10 w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-linear-to-r from-primary to-primary/90 gap-2 sm:w-auto"
                    onClick={() => logInfo("sheet.trigger_click", { openBeforeClick: open })}
                >
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Abrir Novo Chamado</span>
                    <span className="sm:hidden">Novo</span>
                </Button>
            </SheetTrigger>

            <SheetContent className="w-full p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l-border/50 sm:max-w-150">

                {/* HEADER */}
                <div className="p-6 border-b border-border/40 bg-muted/10">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-3 text-xl">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            Nova Solicitacao
                        </SheetTitle>
                        <SheetDescription>
                            Descreva seu problema ou dÃºvida detalhadamente.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* FORMULÃRIO */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        <Form {...form}>
                            <form
                                id="ticket-form"
                                onSubmit={(event) => {
                                    logInfo("sheet.submit_start", { filesCount: files.length });
                                    try {
                                        onSubmit(event);
                                    } catch (error) {
                                        logError("sheet.submit_sync_throw", error, { filesCount: files.length });
                                        throw error;
                                    }
                                }}
                                className="space-y-6"
                            >

                                {/* DADOS BÃSICOS */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit border border-primary/10">
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>InformaÃ§Ãµes BÃ¡sicas</span>
                                    </div>

                                    <FormField control={form.control} name="subject" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Assunto</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Erro ao emitir Nota Fiscal..." className="bg-muted/30 focus:bg-background" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    {isSystemUser && (
                                        <FormItem>
                                            <FormLabel>E-mail do cliente</FormLabel>
                                            <FormControl>
                                                <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-between bg-muted/30 hover:bg-muted/40",
                                                                !customerEmail && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <span className="truncate text-left">
                                                                {customerEmail ? `${customerEmail} (${customerCompany})` : "Buscar e-mail do cliente..."}
                                                            </span>
                                                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                        <div className="border-b p-2.5">
                                                            <Input
                                                                type="text"
                                                                value={searchQuery}
                                                                onChange={(event) => setSearchQuery(event.target.value)}
                                                                placeholder="Digite nome ou e-mail para buscar..."
                                                                className="bg-background"
                                                            />
                                                        </div>
                                                        <div className="max-h-64 overflow-y-auto py-1">
                                                            {customerOptions.map((option) => {
                                                                const selected = option.email === customerEmail.trim().toLowerCase();
                                                                return (
                                                                    <button
                                                                        key={`${option.email}:${option.companyName}`}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCustomerEmail(option.email);
                                                                            setCustomerCompany(option.companyName);
                                                                            setCustomerPickerOpen(false);
                                                                        }}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60",
                                                                            selected && "bg-primary/5"
                                                                        )}
                                                                    >
                                                                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                                        <span className="min-w-0 flex-1">
                                                                            <span className="block truncate font-medium">{option.companyName}</span>
                                                                            <span className="block truncate text-xs text-muted-foreground">{option.email}</span>
                                                                        </span>
                                                                        {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                                                                    </button>
                                                                );
                                                            })}
                                                            {!customerOptions.length && !isCustomerOptionsLoading && (
                                                                <p className="px-3 py-4 text-xs text-muted-foreground">
                                                                    Nenhum cliente encontrado para o filtro informado.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </FormControl>
                                            <FormDescription>
                                                Informe um e-mail de cliente ativo e vinculado no portal.
                                            </FormDescription>
                                            {isCustomerOptionsLoading && (
                                                <p className="text-xs text-muted-foreground">Buscando clientes...</p>
                                            )}
                                        </FormItem>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="incident">Incidente / Erro</SelectItem>
                                                        <SelectItem value="question">DÃºvida</SelectItem>
                                                        <SelectItem value="request">Solicitacao</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="priority" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prioridade</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="1 low">Baixa</SelectItem>
                                                        <SelectItem value="2 normal">Normal</SelectItem>
                                                        <SelectItem value="3 high">Alta (Urgente)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>

                                {/* DETALHES */}
                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit border border-primary/10">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>Detalhamento</span>
                                    </div>

                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descricao</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Descreva o passo a passo..." className="min-h-37.5 resize-y bg-muted/30 focus:bg-background" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription className="flex items-center gap-1 text-xs">
                                                <Info className="h-3 w-3" /> Quanto mais detalhes, melhor.
                                            </FormDescription>
                                        </FormItem>
                                    )} />

                                    {/* UPLOAD VISUAL */}
                                    <div className="space-y-3">
                                        <FormLabel>Anexos (Opcional)</FormLabel>
                                        <div
                                            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 hover:border-primary/40 transition-all group"
                                            onClick={triggerFileInput}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <Paperclip className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Clique para adicionar arquivos</p>
                                            <p className="text-xs text-muted-foreground mt-1">Imagens ou PDFs (MÃ¡x. 5MB)</p>
                                            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileChange} />
                                        </div>

                                        {/* Lista de Arquivos */}
                                        {files.length > 0 && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                {files.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-md border bg-background/50 text-sm">
                                                        <div className="flex items-center gap-3 truncate">
                                                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex flex-col truncate">
                                                                <span className="truncate max-w-50 font-medium">{file.name}</span>
                                                                <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                                                            </div>
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeFile(idx)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>

                {/* FOOTER */}
                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10">
                    <div className="flex flex-col sm:flex-row w-full items-center justify-between gap-4">
                        <Button variant="link" className="text-xs text-muted-foreground h-auto p-0 hidden sm:flex gap-1" asChild>
                            <a href="/docs/manual" target="_blank"><HelpCircle className="h-3 w-3" /> Precisa de ajuda?</a>
                        </Button>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="flex-1 sm:flex-none">Cancelar</Button>
                            <Button type="submit" form="ticket-form" disabled={isPending} className="flex-1 sm:flex-none shadow-md min-w-35">
                                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Abrir Chamado</>}
                            </Button>
                        </div>
                    </div>
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}


