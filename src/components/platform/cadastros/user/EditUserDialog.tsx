"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
import { updateUserAction } from "@/actions/admin/user-actions";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import {
    Loader2, Save, User, Building2, Briefcase, Phone,
    Fingerprint, Mail, ShieldCheck, Lock, Eye, EyeOff, AlertTriangle
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPhone } from "@/lib/formatters";
import { UserMembershipsList } from "./UserMembershipsList";

interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: any;
    companies: any[];
    isAdmin: boolean;
}

export function EditUserDialog({ open, onOpenChange, user, companies, isAdmin }: EditUserDialogProps) {
    const isTargetSystemUser = user ? [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE].includes(user.role) : false;

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema) as any,
        defaultValues: {
            name: "",
            email: "",
            password: "placeholder",
            role: Role.CLIENTE_USER,
            companyId: "",
            jobTitle: "",
            phone: "",
            cpf: "",
        },
    });

    const { isSubmitting } = form.formState;

    // Sincronização de Dados
    useEffect(() => {
        if (user && open) {
            form.reset({
                name: user.name || "",
                email: user.email || "",
                password: "placeholder",
                role: user.role as Role,
                companyId: user.memberships?.[0]?.companyId || "",
                jobTitle: user.jobTitle || "",
                phone: user.phone || "",
                cpf: user.cpf || "",
            });
        }
    }, [user, open, form]);

    const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
        if (!user) return;
        const result = await updateUserAction(user.id, data);

        if (result.success) {
            toast.success(result.message || "Usuário atualizado com sucesso!");
            onOpenChange(false);
        } else {
            if (result.errors) {
                Object.entries(result.errors).forEach(([key, messages]) => {
                    form.setError(key as any, { type: "manual", message: messages[0] });
                });
            }
            toast.error(result.message || "Erro ao atualizar usuário.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 flex flex-col max-h-[95vh] overflow-hidden border-border/50 shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <User className="w-5 h-5 text-primary" /> Editar Cadastro
                    </DialogTitle>
                    <DialogDescription>
                        Gerencie as informações de <strong>{user?.name || user?.email}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                {!isTargetSystemUser ? (
                                    <Tabs defaultValue="dados" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 h-auto">
                                            <TabsTrigger value="dados" className="gap-2 py-2">
                                                <User className="w-4 h-4" /> Dados Pessoais
                                            </TabsTrigger>
                                            <TabsTrigger value="vinculos" className="gap-2 py-2">
                                                <Building2 className="w-4 h-4" /> Empresas e Acessos
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="dados" className="space-y-6 outline-none animate-in fade-in-50">
                                            <UserFields form={form} isSystemUser={false} />
                                            <PasswordChangeSection form={form} isAdmin={isAdmin} />
                                        </TabsContent>

                                        <TabsContent value="vinculos" className="mt-0 outline-none animate-in fade-in-50">
                                            <UserMembershipsList
                                                userId={user?.id}
                                                userEmail={user?.email}
                                                memberships={user?.memberships || []}
                                                companies={companies}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in-50">
                                        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Acesso Administrativo</span>
                                        </div>
                                        <UserFields form={form} isSystemUser={true} />
                                        <PasswordChangeSection form={form} isAdmin={isAdmin} />
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <DialogFooter className="px-6 py-4 bg-muted/20 border-t gap-3">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[160px] font-bold">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** * SUBCOMPONENT: Campos de Dados Pessoais
 */
function UserFields({ form, isSystemUser }: { form: UseFormReturn<CreateUserInput>, isSystemUser: boolean }) {
    return (
        <div className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold">Nome Completo</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="Ex: João Silva" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Mail className="w-3.5 h-3.5 opacity-60" /> E-mail</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} type="email" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5 opacity-60" /> CPF</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} placeholder="000.000.000-00" maxLength={14} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 opacity-60" /> Cargo</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Phone className="w-3.5 h-3.5 opacity-60" /> Telefone</FormLabel>
                        <FormControl>
                            <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            {isSystemUser && (
                <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50">
                        <FormLabel className="text-purple-700 dark:text-purple-300 font-bold">Nível de Acesso</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={Role.SUPORTE}>Suporte Técnico</SelectItem>
                                <SelectItem value={Role.DEVELOPER}>Desenvolvedor</SelectItem>
                                <SelectItem value={Role.ADMIN}>Super Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
            )}
        </div>
    );
}

/** * SUBCOMPONENT: Lógica de Alteração de Senha
 */
function PasswordChangeSection({ form, isAdmin }: { form: UseFormReturn<CreateUserInput>, isAdmin: boolean }) {
    const [isChanging, setIsChanging] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    if (!isAdmin) return null;

    return (
        <div className="mt-2 pt-4 border-t border-dashed">
            {!isChanging ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-orange-600 transition-colors"
                    onClick={() => {
                        setIsChanging(true);
                        form.setValue("password", ""); // Remove o placeholder para entrada real
                    }}
                >
                    <Lock className="w-3.5 h-3.5" /> Alterar Senha de Acesso
                </Button>
            ) : (
                <div className="space-y-3 p-4 bg-orange-50/50 dark:bg-orange-950/10 rounded-xl border border-orange-200 dark:border-orange-900/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-orange-800 dark:text-orange-400 font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4" /> Nova Senha
                        </FormLabel>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:bg-orange-100 dark:hover:bg-orange-900/50"
                            onClick={() => {
                                setIsChanging(false);
                                form.setValue("password", "placeholder"); // Restaura o placeholder de segurança
                            }}
                        >
                            Cancelar
                        </Button>
                    </div>

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type={isVisible ? "text" : "password"}
                                            placeholder="Mínimo 6 caracteres"
                                            className="bg-background pr-10 focus-visible:ring-orange-500"
                                        />
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                        onClick={() => setIsVisible(!isVisible)}
                                    >
                                        {isVisible ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </div>
    );
}