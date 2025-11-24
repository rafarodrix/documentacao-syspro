"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanySchema, CreateCompanyInput } from "@/core/validation/company-schema";
import { createCompanyAction, updateCompanyAction } from "@/app/(platform)/admin/_actions/company-actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { PlusCircle, Loader2, Pencil } from "lucide-react";

// Interface para definir se estamos editando
interface CompanySheetProps {
    companyToEdit?: {
        id: string;
        cnpj: string;
        razaoSocial: string;
        nomeFantasia: string | null;
        emailContato: string | null;
        telefone: string | null;
    };
}

export function CompanySheet({ companyToEdit }: CompanySheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const isEditing = !!companyToEdit;

    const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<CreateCompanyInput>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            cnpj: companyToEdit?.cnpj || "",
            razaoSocial: companyToEdit?.razaoSocial || "",
            nomeFantasia: companyToEdit?.nomeFantasia || "",
            emailContato: companyToEdit?.emailContato || "",
            telefone: companyToEdit?.telefone || "",
        }
    });

    // Garante que o form resete/atualize quando o modal abre ou a empresa muda
    useEffect(() => {
        if (open) {
            reset({
                cnpj: companyToEdit?.cnpj || "",
                razaoSocial: companyToEdit?.razaoSocial || "",
                nomeFantasia: companyToEdit?.nomeFantasia || "",
                emailContato: companyToEdit?.emailContato || "",
                telefone: companyToEdit?.telefone || "",
            });
        }
    }, [open, companyToEdit, reset]);

    async function onSubmit(data: CreateCompanyInput) {
        setIsPending(true);

        let result;

        if (isEditing && companyToEdit) {
            // Modo Edição
            result = await updateCompanyAction(companyToEdit.id, data);
        } else {
            // Modo Criação
            result = await createCompanyAction(data);
        }

        setIsPending(false);

        if (result.success) {
            toast.success(isEditing ? "Empresa atualizada!" : "Empresa criada!");
            setOpen(false);
            if (!isEditing) reset(); // Só limpa o form se for criação
        } else {
            toast.error(typeof result.error === 'string' ? result.error : "Erro na operação");
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {/* Renderiza botão diferente dependendo do modo */}
                {isEditing ? (
                    <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                ) : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Empresa
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{isEditing ? "Editar Empresa" : "Cadastrar Empresa"}</SheetTitle>
                    <SheetDescription>
                        {isEditing ? "Altere os dados abaixo." : "Adicione um novo cliente ao portal."}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
                    <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" {...register("cnpj")} disabled={isEditing} /> {/* CNPJ geralmente não se muda */}
                        {errors.cnpj && <span className="text-sm text-red-500">{errors.cnpj.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="razaoSocial">Razão Social</Label>
                        <Input id="razaoSocial" {...register("razaoSocial")} />
                        {errors.razaoSocial && <span className="text-sm text-red-500">{errors.razaoSocial.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                        <Input id="nomeFantasia" {...register("nomeFantasia")} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="emailContato">E-mail de Contato</Label>
                        <Input id="emailContato" type="email" {...register("emailContato")} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" {...register("telefone")} />
                    </div>

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? "Salvar Alterações" : "Salvar Cadastro")}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}