// src\components\platform\cadastros\user\EditUserDialog.tsx
"use client"

import { useEffect } from "react"
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema"
import { updateUserAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"

import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
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
import { Loader2, Save, User, Building2, Briefcase, Phone, Fingerprint, Mail, ShieldCheck } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

import { UserMembershipsList } from "./UserMembershipsList"
import { formatCNPJ, formatPhone } from "@/lib/formatters" // Certifique-se de ter formatCPF aqui também

interface EditUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any // Idealmente User & { memberships: Membership[] }
    companies: any[]
    isAdmin: boolean
}

export function EditUserDialog({ open, onOpenChange, user, companies, isAdmin }: EditUserDialogProps) {
    // Identifica se o usuário sendo editado é da equipe interna
    const isTargetSystemUser = user ? [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE].includes(user.role) : false

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema) as any,
        defaultValues: {
            name: "",
            email: "",
            password: "placeholder", // Valor fictício para passar na validação de edição
            role: Role.CLIENTE_USER,
            companyId: "",
            jobTitle: "",
            phone: "",
            cpf: ""
        }
    })

    const { isSubmitting } = form.formState

    // Sincroniza dados quando o modal abre ou o usuário muda
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
                cpf: user.cpf || ""
            })
        }
    }, [user, open, form])

    const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
        if (!user) return

        // Removemos o companyId do payload principal, pois o vínculo 
        // é gerenciado pela aba de "Empresas Vinculadas" ou pela transação da action
        const result = await updateUserAction(user.id, data)

        if (result.success) {
            toast.success(result.message || "Usuário atualizado com sucesso!")
            onOpenChange(false)
        } else {
            if (result.errors) {
                Object.entries(result.errors).forEach(([key, messages]) => {
                    form.setError(key as any, { type: "manual", message: messages[0] })
                })
            } else {
                toast.error(result.message || "Erro ao atualizar usuário.")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 flex flex-col max-h-[95vh] overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <User className="w-5 h-5 text-primary" /> Editar Cadastro
                    </DialogTitle>
                    <DialogDescription>
                        Ajuste as informações profissionais e permissões de <strong>{user?.name || user?.email}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                {/* Layout condicional: Usuários do sistema não precisam de aba de vínculos aqui se o RBAC for global */}
                                {!isTargetSystemUser ? (
                                    <Tabs defaultValue="dados" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-auto">
                                            <TabsTrigger value="dados" className="gap-2 py-2"><User className="w-4 h-4" /> Dados Pessoais</TabsTrigger>
                                            <TabsTrigger value="vinculos" className="gap-2 py-2"><Building2 className="w-4 h-4" /> Empresas e Acessos</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="dados" className="space-y-4 outline-none">
                                            <UserFields form={form} isSystemUser={false} />
                                        </TabsContent>

                                        <TabsContent value="vinculos" className="mt-0 outline-none">
                                            <UserMembershipsList
                                                userId={user?.id}
                                                userEmail={user?.email}
                                                memberships={user?.memberships || []}
                                                companies={companies}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                                            <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Perfil Administrativo</span>
                                        </div>
                                        <UserFields form={form} isSystemUser={true} />
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <DialogFooter className="px-6 py-4 bg-muted/20 border-t flex items-center justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

/** * Subcomponente de Campos do Usuário com Tipagem correta
 */
interface UserFieldsProps {
    form: UseFormReturn<CreateUserInput>
    isSystemUser: boolean
}

function UserFields({ form, isSystemUser }: UserFieldsProps) {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold">Nome Completo</FormLabel>
                    <FormControl><Input {...field} value={(field.value as string) ?? ""} placeholder="Ex: João Silva" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Mail className="w-3.5 h-3.5 opacity-70" /> E-mail</FormLabel>
                        <FormControl><Input {...field} value={(field.value as string) ?? ""} type="email" placeholder="email@empresa.com" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5 opacity-70" /> CPF</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                value={(field.value as string) ?? ""}
                                placeholder="000.000.000-00"
                                maxLength={14}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 opacity-70" /> Cargo / Função</FormLabel>
                        <FormControl><Input {...field} value={(field.value as string) ?? ""} placeholder="Ex: Diretor Financeiro" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2"><Phone className="w-3.5 h-3.5 opacity-70" /> Telefone / WhatsApp</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                value={(field.value as string) ?? ""}
                                onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            {/* Controle de Nível de Acesso (Apenas para equipe de sistema ou Admins) */}
            {isSystemUser && (
                <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
                        <FormLabel className="text-purple-700 dark:text-purple-300 font-bold">Nível de Acesso Global</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string}>
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

            {/* Mantemos o campo de senha oculto para não quebrar o schema de criação compartilhado */}
            <input type="hidden" {...form.register("password")} />
        </div>
    )
}