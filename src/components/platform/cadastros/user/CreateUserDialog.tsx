"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema"
import { createUserAction, linkUserToCompanyAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserPlus, Loader2, Link as LinkIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CreateUserDialogProps {
    companies: any[]
    isAdmin: boolean
    context?: 'SYSTEM' | 'CLIENT'
}

export function CreateUserDialog({ companies, isAdmin, context }: CreateUserDialogProps) {
    const [open, setOpen] = useState(false)

    const defaultCompanyId = !isAdmin && companies.length > 0 ? companies[0].id : ""
    const defaultRole = context === 'SYSTEM' ? Role.SUPORTE : Role.CLIENTE_USER

    const formCreate = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "", email: "", password: "",
            role: defaultRole,
            companyId: defaultCompanyId,
            // Campos Opcionais (Strings Vazias)
            jobTitle: "",
            phone: "",
            cpf: ""
        }
    })

    const formLink = useForm({
        defaultValues: {
            email: "",
            role: Role.CLIENTE_USER,
            companyId: defaultCompanyId
        }
    })

    const onSubmitCreate: SubmitHandler<CreateUserInput> = async (data) => {
        if (!isAdmin && defaultCompanyId) data.companyId = defaultCompanyId
        if (context === 'SYSTEM') data.companyId = undefined;

        const result = await createUserAction(data)
        handleResult(result, formCreate)
    }

    const onSubmitLink = async (data: any) => {
        if (!isAdmin && defaultCompanyId) data.companyId = defaultCompanyId
        if (!data.companyId && context !== 'SYSTEM') {
            toast.error("Selecione uma empresa.")
            return
        }
        const result = await linkUserToCompanyAction(data)
        handleResult(result, formLink)
    }

    const handleResult = (result: any, form: any) => {
        if (result.success) {
            toast.success(result.message || "Operação realizada com sucesso!")
            setOpen(false)
            form.reset()
        } else {
            toast.error(typeof result.error === 'string' ? result.error : "Erro na operação")
        }
    }

    // Subcomponente com os Novos Campos
    const RenderCreateFields = ({ form }: any) => (
        <div className="space-y-4">
            {/* Bloco 1: Identificação */}
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input placeholder="João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-mail *</FormLabel><FormControl><Input placeholder="joao@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Senha *</FormLabel><FormControl><Input type="password" placeholder="******" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            {/* Bloco 2: Dados Profissionais (NOVOS) */}
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cargo / Função</FormLabel>
                        <FormControl><Input placeholder="Ex: Gerente" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Telefone / WhatsApp</FormLabel>
                        <FormControl><Input placeholder="(00) 90000-0000" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            {/* Bloco 3: Configuração de Acesso */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <RoleSelect form={form} isAdmin={isAdmin} context={context} />
                <CompanySelect form={form} isAdmin={isAdmin} companies={companies} context={context} />
            </div>
        </div>
    )

    // ... (RoleSelect e CompanySelect continuam iguais) ...
    const RoleSelect = ({ form, isAdmin, context }: any) => (
        <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
                <FormLabel>Nível de Acesso</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                        {context !== 'SYSTEM' && (
                            <>
                                <SelectItem value={Role.CLIENTE_USER}>Usuário</SelectItem>
                                <SelectItem value={Role.CLIENTE_ADMIN}>Gestor</SelectItem>
                            </>
                        )}
                        {isAdmin && context !== 'CLIENT' && (
                            <>
                                {context !== 'SYSTEM' && <SelectSeparator />}
                                <SelectItem value={Role.SUPORTE}>Suporte</SelectItem>
                                <SelectItem value={Role.DEVELOPER}>Dev</SelectItem>
                                <SelectItem value={Role.ADMIN}>Super Admin</SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )} />
    )

    const CompanySelect = ({ form, isAdmin, companies, context }: any) => {
        if (context === 'SYSTEM') return null;
        if (isAdmin) {
            return (
                <FormField control={form.control} name="companyId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {companies.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
            )
        }
        return (
            <div className="space-y-2 opacity-70">
                <FormLabel>Empresa</FormLabel>
                <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted flex items-center truncate">
                    {companies[0]?.nomeFantasia || "Minha Empresa"}
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-2">
                    <UserPlus className="h-4 w-4" />
                    {context === 'SYSTEM' ? "Novo Administrador" : (isAdmin ? "Gerenciar Usuário" : "Convidar Membro")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-2 bg-muted/30 border-b">
                    <DialogTitle>Gerenciar Acesso</DialogTitle>
                    <DialogDescription>Adicione um novo usuário ou vincule um existente.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {context === 'SYSTEM' ? (
                            <Form {...formCreate}>
                                <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-4">
                                    <RenderCreateFields form={formCreate} />
                                    <DialogFooter className="pt-4">
                                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={formCreate.formState.isSubmitting}>
                                            {formCreate.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        ) : (
                            <Tabs defaultValue="create" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="create">Criar Novo</TabsTrigger>
                                    <TabsTrigger value="link">Vincular Existente</TabsTrigger>
                                </TabsList>

                                <TabsContent value="create" className="mt-0">
                                    <Form {...formCreate}>
                                        <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-4">
                                            <RenderCreateFields form={formCreate} />
                                            <DialogFooter className="pt-4">
                                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={formCreate.formState.isSubmitting}>
                                                    {formCreate.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </TabsContent>

                                <TabsContent value="link" className="mt-0">
                                    <Form {...formLink}>
                                        <form onSubmit={formLink.handleSubmit(onSubmitLink)} className="space-y-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-xs text-blue-700 dark:text-blue-300 mb-2 border border-blue-100 dark:border-blue-800">
                                                Adicione um usuário que já tem conta em outra empresa (Matriz/Filial).
                                            </div>
                                            <FormField control={formLink.control} name="email" render={({ field }) => (
                                                <FormItem><FormLabel>E-mail do Usuário</FormLabel><FormControl><Input placeholder="usuario@existente.com" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />

                                            <div className="grid grid-cols-2 gap-4">
                                                <RoleSelect form={formLink} isAdmin={isAdmin} context={context} />
                                                <CompanySelect form={formLink} isAdmin={isAdmin} companies={companies} context={context} />
                                            </div>

                                            <DialogFooter className="pt-4">
                                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                                                <Button type="submit" variant="secondary" disabled={formLink.formState.isSubmitting} className="gap-2">
                                                    {formLink.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                                                    Vincular
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}