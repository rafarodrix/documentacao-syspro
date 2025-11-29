"use client";

import { useState, useTransition, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    PlusCircle,
    Loader2,
    Send,
    FileText,
    AlertCircle,
    Paperclip,
    X,
    MessageSquare,
    HelpCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createTicketAction } from '@/actions/app/ticket-actions';
import { Label } from '@radix-ui/react-dropdown-menu';

// Schema aprimorado
// CORREÇÃO: Removemos .default() para evitar conflito de tipos (string | undefined vs string)
const ticketSchema = z.object({
    subject: z.string().min(5, 'O assunto deve ser claro e objetivo (mín. 5 caracteres).'),
    type: z.string(),
    priority: z.string(),
    description: z.string().min(20, 'Por favor, forneça mais detalhes sobre o problema (mín. 20 caracteres).'),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function TicketSheet() {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        // Os valores padrão são definidos AQUI, garantindo que o formulário inicie preenchido
        defaultValues: {
            subject: '',
            type: 'incident',
            description: '',
            priority: '2 normal',
        },
    });

    // Handler de Upload (Visual por enquanto)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    async function onSubmit(data: TicketFormValues) {
        const formData = new FormData();
        formData.append('subject', data.subject);
        formData.append('description', data.description);
        formData.append('priority', data.priority);
        // formData.append('type', data.type); // Se o backend suportar tipos no futuro

        // Adiciona arquivos ao formData (quando o backend suportar)
        // files.forEach(file => formData.append('files', file));

        startTransition(async () => {
            const result = await createTicketAction({ success: false }, formData);

            if (result.success) {
                toast.success('Chamado aberto com sucesso!');
                setOpen(false);
                form.reset();
                setFiles([]);
            } else {
                toast.error(result.message || 'Erro ao criar chamado.');
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-gradient-to-r from-primary to-primary/90">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Abrir Novo Chamado
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-[600px] w-full overflow-y-auto border-l-border/50 bg-background/95 backdrop-blur-xl flex flex-col p-0">

                {/* HEADER FIXO */}
                <div className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-3 text-xl">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            Nova Solicitação
                        </SheetTitle>
                        <SheetDescription>
                            Preencha os detalhes abaixo para que nossa equipe possa ajudar você o mais rápido possível.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* FORMULÁRIO SCROLLÁVEL */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <Form {...form}>
                        <form id="ticket-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Título e Tipo */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                    <FileText className="h-4 w-4" />
                                    <span>Informações Básicas</span>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Assunto</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ex: Erro ao processar XML de NFe"
                                                    className="bg-muted/30 focus:bg-background transition-all h-11"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Um resumo curto do problema ou solicitação.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-muted/30 focus:bg-background h-10">
                                                            <SelectValue placeholder="Selecione..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="incident">Incidente / Erro</SelectItem>
                                                        <SelectItem value="question">Dúvida</SelectItem>
                                                        <SelectItem value="request">Solicitação de Serviço</SelectItem>
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
                                                        <SelectTrigger className="bg-muted/30 focus:bg-background h-10">
                                                            <SelectValue placeholder="Selecione..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="1 low">Baixa (Pode esperar)</SelectItem>
                                                        <SelectItem value="2 normal">Normal (Padrão)</SelectItem>
                                                        <SelectItem value="3 high">Alta (Urgente)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Detalhes */}
                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Detalhamento</span>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição Completa</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Descreva o passo a passo para reproduzir o problema. Se possível, inclua mensagens de erro exatas."
                                                    className="min-h-[150px] resize-y bg-muted/30 focus:bg-background transition-all p-4 leading-relaxed"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Upload de Arquivos (Visual) */}
                                <div className="space-y-2">
                                    <Label>Anexos (Opcional)</Label>
                                    <div
                                        className="border-2 border-dashed border-border/60 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/20 hover:border-primary/30 transition-all"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">Clique para adicionar arquivos</p>
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou PDF (Máx. 5MB)</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    {/* Lista de Arquivos Selecionados */}
                                    {files.length > 0 && (
                                        <div className="space-y-2 mt-2">
                                            {files.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-background text-sm">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                        <span className="truncate max-w-[200px]">{file.name}</span>
                                                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)}kb)</span>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(idx)}>
                                                        <X className="h-3 w-3" />
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

                {/* FOOTER FIXO */}
                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full items-center justify-between sm:justify-end gap-3">
                        {/* Link de Ajuda Rápida */}
                        <Button variant="link" className="text-xs text-muted-foreground hidden sm:flex gap-1" asChild>
                            <a href="/docs/manual" target="_blank">
                                <HelpCircle className="h-3 w-3" /> Precisa de ajuda antes?
                            </a>
                        </Button>

                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="flex-1 sm:flex-none">
                                Cancelar
                            </Button>
                            <Button type="submit" form="ticket-form" disabled={isPending} className="flex-1 sm:flex-none shadow-lg shadow-primary/20 min-w-[140px]">
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
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}