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
    Sheet, SheetContent, SheetHeader, SheetTitle,
    SheetTrigger, SheetDescription, SheetFooter
} from "@/components/ui/sheet";

import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
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

    // Formulário
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors }
    } = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: undefined,
            companyId: "",
        }
    });

    // Preenche ao abrir em modo de edição
    useEffect(() => {
        if (open && isEditing && userToEdit) {
            const companyId = userToEdit.companies[0]?.id || "";

            setValue("name", userToEdit.name || "");
            setValue("email", userToEdit.email);
            setValue("role", userToEdit.role as any);
            setValue("companyId", companyId);
            setValue("password", "");
        }

        if (open && !isEditing) {
            reset();
        }
    }, [open, isEditing, userToEdit, reset, setValue]);

    // Envio do formulário
    async function onSubmit(data: CreateUserInput) {
        setIsPending(true);

        const result = isEditing && userToEdit
            ? await updateUserAction(userToEdit.id, data)
            : await createUserAction(data);

        setIsPending(false);

        if (result.success) {
            toast.success(isEditing ? "Usuário atualizado!" : "Usuário criado!");
            setOpen(false);
            if (!isEditing) reset();
        } else {
            toast.error(result.error || "Erro ao salvar");
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
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
            </SheetTrigger>

            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{isEditing ? "Editar Usuário" : "Cadastrar Usuário"}</SheetTitle>
                    <SheetDescription>
                        {isEditing
                            ? "Atualize os dados do usuário."
                            : "Crie um acesso ao sistema."}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
                    {/* NOME */}
                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input {...register("name")} placeholder="João Silva" />
                        {errors.name && (
                            <span className="text-xs text-red-500">{errors.name.message}</span>
                        )}
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input
                            type="email"
                            {...register("email")}
                            disabled={isEditing}
                            placeholder="joao@empresa.com"
                        />
                        {errors.email && (
                            <span className="text-xs text-red-500">{errors.email.message}</span>
                        )}
                    </div>

                    {/* SENHA */}
                    {!isEditing ? (
                        <div className="space-y-2">
                            <Label>Senha Inicial</Label>
                            <Input type="password" {...register("password")} placeholder="********" />
                            {errors.password && (
                                <span className="text-xs text-red-500">{errors.password.message}</span>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            A senha não pode ser alterada aqui.
                        </p>
                    )}

                    {/* ROLE */}
                    <div className="space-y-2">
                        <Label>Nível de Acesso</Label>
                        <Select
                            onValueChange={(val) => setValue("role", val as any)}
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
                    </div>

                    {/* EMPRESA */}
                    <div className="space-y-2">
                        <Label>Empresa Vinculada</Label>
                        <Select
                            onValueChange={(val) => setValue("companyId", val)}
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
                    </div>

                    {/* BOTÃO */}
                    <SheetFooter className="pt-4">
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : isEditing ? (
                                "Salvar Alterações"
                            ) : (
                                "Criar Usuário"
                            )}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
