"use client"

import { useState, useEffect } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
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
import { Loader2, Save } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Importa o componente de lista de vínculos
import { UserMembershipsList } from "./UserMembershipsList"

interface EditUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any // Dados do usuário vindo da tabela
    companies: any[]
    isAdmin: boolean
}

// --- VERIFIQUE SE ESTA LINHA ESTÁ COM 'export' (sem default) ---
export function EditUserDialog({ open, onOpenChange, user, companies, isAdmin }: EditUserDialogProps) {

    // Identifica se o usuário sendo editado é da equipe interna
    const isTargetSystemUser = user ? ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(user.role) : false

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "placeholder", // Senha fake para passar na validação Zod
            role: Role.CLIENTE_USER,
            companyId: ""
        }
    })

    // Efeito para preencher o formulário
    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name || "",
                email: user.email || "",
                password: "placeholder",
                role: user.role as Role,
                companyId: ""
            })
        }
    }, [user, form])

    const { isSubmitting } = form.formState

    // Submit apenas dos dados básicos (Nome/Email/Role Global)
    const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
        if (!user) return

        // Limpamos companyId do payload pois a gestão de empresa é feita separadamente
        const { companyId, ...payload } = data

        const result = await updateUserAction(user.id, payload)

        if (result.success) {
            toast.success("Dados básicos atualizados!")
            onOpenChange(false)
        } else {
            toast.error(typeof result.error === 'string' ? result.error : "Erro ao atualizar dados")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>Alterando dados de <strong>{user?.name}</strong>.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">

                            {/* SEÇÃO 1: DADOS BÁSICOS */}
                            <div className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Input oculto para senha */}
                                <input type="hidden" {...form.register("password")} />
                            </div>

                            {/* SEÇÃO 2: ROLE DE SISTEMA (Apenas se for equipe interna) */}
                            {isTargetSystemUser && (
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Função no Sistema</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value={Role.SUPORTE}>Suporte</SelectItem>
                                                <SelectItem value={Role.DEVELOPER}>Desenvolvedor</SelectItem>
                                                <SelectItem value={Role.ADMIN}>Super Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}

                            {/* SEÇÃO 3: VÍNCULOS COM EMPRESAS (Multi-tenant) */}
                            {!isTargetSystemUser && user && (
                                <UserMembershipsList
                                    userId={user.id}
                                    userEmail={user.email}
                                    memberships={user.memberships || []}
                                    companies={companies}
                                />
                            )}

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar Dados Básicos
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}