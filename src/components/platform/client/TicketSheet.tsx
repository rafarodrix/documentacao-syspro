'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { PlusCircle, Loader2, Send } from 'lucide-react';

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
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { createTicketAction } from '@/app/(platform)/client/_actions/ticket-actions';

// Schema de validação
const ticketSchema = z.object({
    subject: z.string().min(5, 'O assunto deve ter pelo menos 5 caracteres.'),
    description: z.string().min(20, 'Descreva o problema com mais detalhes (mínimo 20 caracteres).'),
    // CORREÇÃO: Removemos .default() aqui para alinhar a tipagem estrita do TS com o RHF.
    // O valor padrão real é gerenciado pelo defaultValues do hook useForm abaixo.
    priority: z.string(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function TicketSheet() {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            subject: '',
            description: '',
            priority: '2 normal', // Valor padrão definido aqui
        },
    });

    async function onSubmit(data: TicketFormValues) {
        // Prepara o FormData para a Server Action
        const formData = new FormData();
        formData.append('subject', data.subject);
        formData.append('description', data.description);
        formData.append('priority', data.priority);

        startTransition(async () => {
            // O prevState é necessário para Server Actions, passamos um estado inicial dummy
            const result = await createTicketAction({ success: false }, formData);

            if (result.success) {
                toast.success('Chamado criado com sucesso!');
                setOpen(false);
                form.reset();
            } else {
                toast.error(result.message || 'Erro ao criar chamado.');
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Abrir Novo Chamado
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Novo Chamado de Suporte</SheetTitle>
                    <SheetDescription>
                        Descreva seu problema detalhadamente. Nossa equipe técnica analisará em breve.
                    </SheetDescription>
                </SheetHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assunto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Erro ao emitir NFe de devolução" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prioridade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a prioridade" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1 low">Baixa</SelectItem>
                                                <SelectItem value="2 normal">Normal</SelectItem>
                                                <SelectItem value="3 high">Alta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição Detalhada</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva o passo a passo para reproduzir o erro, mensagens exibidas, etc..."
                                            className="min-h-[150px] resize-y"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <SheetFooter className="pt-4">
                            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Enviar Solicitação
                                    </>
                                )}
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}