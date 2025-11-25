"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, CreateUserInput } from "@/core/validation/user-schema";
import { createUserAction, updateUserAction } from "@/app/(platform)/admin/_actions/user-actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, Pencil } from "lucide-react";

interface UserSheetProps {
    companies: { id: string; razaoSocial: string }[];
    userToEdit?: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        companies: { id: string }[];
    };
}

export function UserSheet({ companies, userToEdit }: UserSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const isEditing = !!userToEdit;

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
        if (open && userToEdit) {
            const currentCompanyId = userToEdit.companies[0]?.id || "";
            setValue("name", userToEdit.name || "");
            setValue("email", userToEdit.email);
            setValue("role", userToEdit.role as any);
            setValue("companyId", currentCompanyId);
            setValue("password", "");
        } else if (open && !userToEdit) {
            reset();
        }
    }, [open, userToEdit, reset, setValue]);

    async function onSubmit(data: CreateUserInput) {
        setIsPending(true);
        let result;

        try {
            if (isEditing && userToEdit) {
                result = await updateUserAction(userToEdit.id, data);
            } else {
                result = await createUserAction(data);
            }

            if (result.success) {
                toast.success(isEditing ? "Usuário atualizado!" : "Usuário criado!");
                setOpen(false);
                if (!isEditing) reset();
            } else {
                const errorMsg = typeof result.error === 'string' ? result.error : "Erro na operação";
                toast.error(errorMsg);
            }
        } catch (error) {
            toast.error("Erro inesperado ao salvar.");
        } finally {
            setIsPending(false);
        }
    }

    const onError = () => {
        toast.error("Verifique os campos obrigatórios.");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="sm">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                ) : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Usuário
                    </Button>
                )}
            </DialogTrigger>

            {/* Layout Largo e Responsivo */}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Usuário" : "Cadastrar Usuário"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Altere os dados de acesso." : "Crie um novo acesso ao sistema."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 py-4">
                    <form id="user-form" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">

                        {/* DADOS PESSOAIS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Nome Completo</Label>
                                <Input {...register("name")} placeholder="João Silva" />
                                {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                            </div>

                            <div className="space-y-2 col-span-1">
                                <Label>E-mail</Label>
                                <Input type="email" {...register("email")} placeholder="joao@empresa.com" disabled={isEditing} />
                                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                            </div>

                            {/* Campo de Senha */}
                            <div className="space-y-2 col-span-1">
                                <Label>Senha {isEditing ? "(Opcional)" : ""}</Label>
                                <Input
                                    type="password"
                                    {...register("password")}
                                    placeholder={isEditing ? "********" : "Mínimo 8 caracteres"}
                                // Na edição, desativamos visualmente se quiser, ou deixamos ativo para troca
                                />
                                {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                            </div>
                        </div>

                        {/* PERMISSÕES */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Permissões</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nível de Acesso</Label>
                                    <Select
                                        onValueChange={(val) => setValue("role", val as any, { shouldValidate: true })}
                                        defaultValue={userToEdit?.role}
                                    >
                                        <SelectTrigger>
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma empresa..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.razaoSocial}
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

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" form="user-form" className="w-full sm:w-auto" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? "Salvar Alterações" : "Criar Usuário")}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}