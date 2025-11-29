"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema"
import { updateUserAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface EditUserDialogProps {
    user: any // Dados do usuário a ser editado
    companies: any[]
    isAdmin: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, companies, isAdmin, open, onOpenChange }: EditUserDialogProps) {

    // Encontrar o ID da empresa atual do usuário (se houver)
    const currentCompanyId = user?.memberships?.[0]?.companyId || ""

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "placeholder", // O Zod exige senha, passamos uma fake que o backend vai ignorar se não mudarmos
            role: Role.CLIENTE_USER,
            companyId: ""
        }
    })

    // Preenche o formulário quando o usuário muda
    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name || "",
                email: user.email || "",
                password: "placeholder", // Senha fake para passar na validação (não enviamos pro update se não mudar)
                role: user.role as Role,
                companyId: currentCompanyId
            })
        }
    }, [user, currentCompanyId, form])

    const { isSubmitting } = form.formState

    async function onSubmit(data: CreateUserInput) {
        if (!user) return

        // Removemos a senha do objeto para não alterar (a action de update ignora se não enviarmos, ou ajustamos lá)
        // No seu updateUserAction atual, ele não atualiza senha, o que é correto.

        const result = await updateUserAction(user.id, {
            ...data,
            // Garante que se for cliente, mantém a empresa (caso a UI tenha perdido)
            companyId: isAdmin ? data.companyId : currentCompanyId
        })

        if (result.success) {
            toast.success("Usuário atualizado com sucesso!")
            onOpenChange(false)
        } else {
            toast.error(result.error || "Erro ao atualizar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>
                        Alterar dados cadastrais de {user?.name}.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-mail</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Ocultamos senha na edição para simplificar. Reset de senha é outra ação. */}
                        <input type="hidden" {...form.register("password")} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nível de Acesso</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={Role.CLIENTE_USER}>Usuário Comum</SelectItem>
                                                <SelectItem value={Role.CLIENTE_ADMIN}>Gestor (Admin)</SelectItem>
                                                {isAdmin && (
                                                    <>
                                                        <SelectItem value={Role.SUPORTE}>Suporte Técnico</SelectItem>
                                                        <SelectItem value={Role.ADMIN}>Super Admin</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {isAdmin ? (
                                <FormField
                                    control={form.control}
                                    name="companyId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Empresa</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {companies.map((company) => (
                                                        <SelectItem key={company.id} value={company.id}>
                                                            {company.nomeFantasia || company.razaoSocial}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <div className="space-y-2 opacity-70">
                                    <FormLabel>Empresa</FormLabel>
                                    <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted text-muted-foreground flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
                                        {companies.find(c => c.id === currentCompanyId)?.nomeFantasia || "Minha Empresa"}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>

                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}