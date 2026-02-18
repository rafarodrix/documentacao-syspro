"use client";

import { useState } from 'react';
import { useTicketSheet } from '@/hooks/use-ticket-sheet';

import {
    PlusCircle, Loader2, Send, FileText, AlertCircle,
    Paperclip, X, MessageSquare, HelpCircle, Info
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

export function TicketSheet() {
    const [open, setOpen] = useState(false);

    // Toda a lógica vem do Hook
    const {
        form, files, isPending, fileInputRef,
        handleFileChange, removeFile, triggerFileInput, onSubmit
    } = useTicketSheet(() => setOpen(false));

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-gradient-to-r from-primary to-primary/90 gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Abrir Novo Chamado</span>
                    <span className="sm:hidden">Novo</span>
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-[600px] w-full p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l-border/50">

                {/* HEADER */}
                <div className="p-6 border-b border-border/40 bg-muted/10">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-3 text-xl">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            Nova Solicitação
                        </SheetTitle>
                        <SheetDescription>
                            Descreva seu problema ou dúvida detalhadamente.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* FORMULÁRIO */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        <Form {...form}>
                            <form id="ticket-form" onSubmit={onSubmit} className="space-y-6">

                                {/* DADOS BÁSICOS */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit border border-primary/10">
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>Informações Básicas</span>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="incident">Incidente / Erro</SelectItem>
                                                        <SelectItem value="question">Dúvida</SelectItem>
                                                        <SelectItem value="request">Solicitação</SelectItem>
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
                                            <FormLabel>Descrição</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Descreva o passo a passo..." className="min-h-[150px] resize-y bg-muted/30 focus:bg-background" {...field} />
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
                                            <p className="text-xs text-muted-foreground mt-1">Imagens ou PDFs (Máx. 5MB)</p>
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
                                                                <span className="truncate max-w-[200px] font-medium">{file.name}</span>
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
                            <Button type="submit" form="ticket-form" disabled={isPending} className="flex-1 sm:flex-none shadow-md min-w-[140px]">
                                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Abrir Chamado</>}
                            </Button>
                        </div>
                    </div>
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}