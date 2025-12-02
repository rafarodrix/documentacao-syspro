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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Save, User, Building2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Importa o componente de lista de vínculos
import { UserMembershipsList } from "../UserMembershipsList"

interface EditUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any
    companies: any[]
    isAdmin: boolean
}

export function EditUserDialog({ open, onOpenChange, user, companies, isAdmin }: EditUserDialogProps) {

    const currentCompanyId = user?.memberships?.[0]?.companyId || ""
    const isTargetSystemUser = user ? ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(user.role) : false

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "", email: "", password: "placeholder",
            role: Role.CLIENTE_USER, companyId: ""
        }
    })

    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name || "",
                email: user.email || "",
                password: "placeholder",
                role: user.role as Role,
                companyId: "" // Vínculos são gerenciados separadamente
            })
        }
    }, [user, form])

    const { isSubmitting } = form.formState

    const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
        if (!user) return

        const { companyId, ...payload } = data // Remove companyId do update básico

        // Se não for admin, força a manter o vínculo atual (segurança extra)
        // Mas a action updateUserAction já cuida disso.

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
            <DialogContent className="sm:max-w-[600px] p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="px-6 pt-6 pb-2 bg-muted/30 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> Editar Usuário
                    </DialogTitle>
                    <DialogDescription>
                        Gerenciando cadastro de <strong>{user?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <ScrollArea className="flex-1">
                            <div className="p-6">

                                {/* SE FOR CLIENTE, USA ABAS PARA ORGANIZAR */}
                                {!isTargetSystemUser ? (
                                    <Tabs defaultValue="dados" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-6">
                                            <TabsTrigger value="dados" className="gap-2"><User className="w-4 h-4" /> Dados Pessoais</TabsTrigger>
                                            <TabsTrigger value="vinculos" className="gap-2"><Building2 className="w-4 h-4" /> Empresas Vinculadas</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="dados" className="space-y-4 mt-0">
                                            <UserFields form={form} isSystemUser={false} isAdmin={isAdmin} />
                                        </TabsContent>

                                        <TabsContent value="vinculos" className="mt-0">
                                            {user && (
                                                <UserMembershipsList
                                                    userId={user.id}
                                                    userEmail={user.email}
                                                    memberships={user.memberships || []}
                                                    companies={companies}
                                                />
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                ) : (
                                    // SE FOR SISTEMA, MOSTRA TUDO JUNTO (Não tem vínculos múltiplos)
                                    <div className="space-y-4">
                                        <UserFields form={form} isSystemUser={true} isAdmin={isAdmin} />
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Dados</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

// Subcomponente para campos comuns
function UserFields({ form, isSystemUser, isAdmin }: { form: any, isSystemUser: boolean, isAdmin: boolean }) {
    return (
        <>
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            {/* Senha oculta */}
            <input type="hidden" {...form.register("password")} />

            {/* Role de Sistema (Só aparece se for equipe interna) */}
            {isSystemUser && (
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
        </>
    )
}