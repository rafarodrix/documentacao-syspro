"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, CreateUserInput } from "@/core/validation/user-schema";
import { createUserAction } from "@/app/(platform)/admin/_actions/user-actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from "@/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";

// Interface para receber as empresas disponíveis
interface CreateUserSheetProps {
    companies: { id: string; razaoSocial: string }[];
}

export function CreateUserSheet({ companies }: CreateUserSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
    });

    async function onSubmit(data: CreateUserInput) {
        setIsPending(true);
        const result = await createUserAction(data);
        setIsPending(false);

        if (result.success) {
            toast.success("Usuário criado com sucesso!");
            setOpen(false);
            reset();
        } else {
            toast.error(typeof result.error === 'string' ? result.error : "Erro ao criar");
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Usuário
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Cadastrar Usuário</SheetTitle>
                    <SheetDescription>Crie um acesso para um cliente ou membro da equipe.</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">

                    {/* Nome */}
                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input {...register("name")} placeholder="João Silva" />
                        {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input type="email" {...register("email")} placeholder="joao@empresa.com" />
                        {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                    </div>

                    {/* Senha */}
                    <div className="space-y-2">
                        <Label>Senha Inicial</Label>
                        <Input type="password" {...register("password")} placeholder="********" />
                        {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                    </div>

                    {/* Role Select */}
                    <div className="space-y-2">
                        <Label>Nível de Acesso</Label>
                        <Select onValueChange={(val) => setValue("role", val as any)}>
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

                    {/* Company Select */}
                    <div className="space-y-2">
                        <Label>Empresa Vinculada</Label>
                        <Select onValueChange={(val) => setValue("companyId", val)}>
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

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Usuário"}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}