"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
import {
    createUserAction,
    updateUserAction,
    toggleUserStatusAction
} from "@/actions/admin/user-actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    PlusCircle,
    Loader2,
    Pencil,
    UserPlus,
    Mail,
    Key,
    Shield,
    Building2,
    Ban,
    CheckCircle,
    UserCog
} from "lucide-react";

interface UserSheetProps {
    companies: { id: string; razaoSocial: string }[];
    userToEdit?: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        isActive?: boolean; // Adicionado para controle de status
        companies: { id: string }[];
    };
}

export function UserSheet({ companies, userToEdit }: UserSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isStatusPending, startStatusTransition] = useTransition();

    const isEditing = !!userToEdit;
    const isActive = userToEdit?.isActive ?? true; // Assume ativo se novo

    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: undefined,
            companyId: "",
        }
    });

    useEffect(() => {
        if (open) {
            if (userToEdit) {
                const currentCompanyId = userToEdit.companies[0]?.id || "";
                reset({
                    name: userToEdit.name || "",
                    email: userToEdit.email,
                    role: userToEdit.role as any,
                    companyId: currentCompanyId,
                    password: "", // Senha vazia na edição
                });
            } else {
                reset({
                    name: "", email: "", password: "", role: undefined, companyId: ""
                });
            }
        }
    }, [open, userToEdit, reset]);

    // Handler para alternar status (Bloquear/Desbloquear)
    const handleToggleStatus = () => {
        if (!userToEdit) return;

        startStatusTransition(async () => {
            const result = await toggleUserStatusAction(userToEdit.id, !!userToEdit.isActive);
            if (result.success) {
                toast.success(result.message);
                setOpen(false);
            } else {
                toast.error(typeof result.error === 'string' ? result.error : "Erro ao alterar status.");
            }
        });
    };

    async function onSubmit(data: CreateUserInput) {
        startTransition(async () => {
            let result;
            try {
                if (isEditing && userToEdit) {
                    result = await updateUserAction(userToEdit.id, data);
                } else {
                    result = await createUserAction(data);
                }

                if (result.success) {
                    toast.success(isEditing ? "Usuário atualizado!" : "Usuário criado com sucesso!");
                    setOpen(false);
                } else {
                    const errorMsg = typeof result.error === 'string' ? result.error : "Erro ao processar operação";
                    toast.error(errorMsg);
                }
            } catch (error) {
                toast.error("Erro inesperado. Tente novamente.");
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        <span className="sr-only">Editar</span>
                    </Button>
                ) : (
                    <Button className="h-9 shadow-md shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5">
                        <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
                    </Button>
                )}
            </SheetTrigger>

            <SheetContent className="sm:max-w-xl w-full overflow-y-auto flex flex-col gap-0 p-0 border-l-border/50 bg-background/95 backdrop-blur-xl">

                {/* HEADER */}
                <div className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md flex justify-between items-start">
                    <div>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-2 text-xl">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                    {isEditing ? <UserCog className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                </div>
                                {isEditing ? "Gerenciar Usuário" : "Novo Usuário"}
                            </SheetTitle>
                            <SheetDescription>
                                {isEditing
                                    ? "Edite os dados de acesso ou altere o status do usuário."
                                    : "Crie um novo acesso vinculado a uma empresa."}
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    {/* Botão de Status (Apenas Edição) */}
                    {isEditing && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleStatus}
                            disabled={isStatusPending}
                            className={`ml-4 border-dashed ${isActive
                                ? "border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/20"
                                : "border-green-200 hover:border-green-500 hover:bg-green-50 text-green-600 dark:hover:bg-green-950/20"
                                }`}
                        >
                            {isStatusPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isActive ? (
                                <>
                                    <Ban className="h-4 w-4 mr-2" /> Bloquear
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Ativar
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* FORMULÁRIO */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                        {/* SEÇÃO 1: CREDENCIAIS */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                <Mail className="h-4 w-4" />
                                <span>Credenciais de Acesso</span>
                            </div>

                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" {...register("name")} placeholder="Ex: João da Silva" className="bg-muted/30 focus:bg-background" />
                                    {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            {...register("email")}
                                            placeholder="joao@empresa.com"
                                            disabled={isEditing}
                                            className="bg-muted/30 focus:bg-background"
                                        />
                                        {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Senha {isEditing && "(Opcional)"}</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type="password"
                                                {...register("password")}
                                                placeholder={isEditing ? "********" : "Mínimo 8 caracteres"}
                                                className="pl-9 bg-muted/30 focus:bg-background"
                                            />
                                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                        </div>
                                        {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* SEÇÃO 2: PERMISSÕES */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                <Shield className="h-4 w-4" />
                                <span>Permissões & Vínculos</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Função no Sistema</Label>
                                    <Select
                                        onValueChange={(val) => setValue("role", val as any, { shouldValidate: true })}
                                        defaultValue={userToEdit?.role}
                                    >
                                        <SelectTrigger className="bg-muted/30 focus:bg-background">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CLIENTE_USER">Cliente (Usuário)</SelectItem>
                                            <SelectItem value="CLIENTE_ADMIN">Cliente (Gestor)</SelectItem>
                                            <SelectItem value="SUPORTE">Suporte Interno</SelectItem>
                                            <SelectItem value="ADMIN">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.role && <span className="text-xs text-red-500">{errors.role.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Empresa Vinculada</Label>
                                    <Select
                                        onValueChange={(val) => setValue("companyId", val, { shouldValidate: true })}
                                        defaultValue={userToEdit?.companies[0]?.id}
                                    >
                                        <SelectTrigger className="bg-muted/30 focus:bg-background">
                                            <SelectValue placeholder="Selecione uma empresa..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-3 w-3 text-muted-foreground" />
                                                        {c.razaoSocial}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.companyId && <span className="text-xs text-red-500">{errors.companyId.message}</span>}
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* FOOTER FIXO */}
                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="user-form" disabled={isPending} className="min-w-[120px] shadow-lg shadow-primary/20">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                </>
                            ) : (
                                isEditing ? "Salvar Alterações" : "Criar Usuário"
                            )}
                        </Button>
                    </div>
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}