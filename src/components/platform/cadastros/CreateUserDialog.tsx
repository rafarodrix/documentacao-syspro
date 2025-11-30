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

interface CreateUserDialogProps {
    companies: any[]
    isAdmin: boolean
    context?: 'SYSTEM' | 'CLIENT'
}

export function CreateUserDialog({ companies, isAdmin, context }: CreateUserDialogProps) {
    const [open, setOpen] = useState(false)

    // --- CONFIGURAÇÃO PADRÃO ---
    const defaultCompanyId = !isAdmin && companies.length > 0 ? companies[0].id : ""
    const defaultRole = context === 'SYSTEM' ? Role.SUPORTE : Role.CLIENTE_USER

    // --- FORM 1: CRIAR NOVO ---
    const formCreate = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "", email: "", password: "",
            role: defaultRole,
            companyId: defaultCompanyId
        }
    })

    // --- FORM 2: VINCULAR EXISTENTE ---
    const formLink = useForm({
        defaultValues: {
            email: "",
            role: defaultRole,
            companyId: defaultCompanyId
        }
    })

    // --- SUBMIT CRIAR ---
    const onSubmitCreate: SubmitHandler<CreateUserInput> = async (data) => {
        if (!isAdmin && defaultCompanyId) data.companyId = defaultCompanyId
        if (context === 'SYSTEM') data.companyId = undefined;

        const result = await createUserAction(data)
        handleResult(result, formCreate)
    }

    // --- SUBMIT VINCULAR ---
    const onSubmitLink = async (data: any) => {
        if (!isAdmin && defaultCompanyId) data.companyId = defaultCompanyId

        // Validação extra manual para garantir que tem empresa selecionada
        if (!data.companyId && context !== 'SYSTEM') {
            toast.error("Selecione uma empresa.")
            return
        }

        const result = await linkUserToCompanyAction(data)
        handleResult(result, formLink)
    }

    const handleResult = (result: any, form: any) => {
        if (result.success) {
            toast.success(result.message || "Sucesso!")
            setOpen(false)
            form.reset()
        } else {
            toast.error(typeof result.error === 'string' ? result.error : "Erro na operação")
        }
    }

    // Renderiza campos comuns (Empresa e Role) para evitar duplicação de código
    const CommonFields = ({ form }: { form: any }) => (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nível de Acesso</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {context !== 'SYSTEM' && (
                                    <>
                                        <SelectItem value={Role.CLIENTE_USER}>Usuário Comum</SelectItem>
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
                    </FormItem>
                )}
            />

            {context !== 'SYSTEM' && (
                isAdmin ? (
                    <FormField
                        control={form.control}
                        name="companyId"
                        render={({ field }) => (
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
                            </FormItem>
                        )}
                    />
                ) : (
                    <div className="space-y-2 opacity-70">
                        <FormLabel>Empresa</FormLabel>
                        <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted flex items-center truncate">
                            {companies[0]?.nomeFantasia || "Minha Empresa"}
                        </div>
                    </div>
                )
            )}
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-2">
                    <UserPlus className="h-4 w-4" />
                    {context === 'SYSTEM' ? "Novo Administrador" : (isAdmin ? "Gerenciar Usuário" : "Convidar Membro")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Gerenciar Acesso</DialogTitle>
                    <DialogDescription>Adicione um novo usuário ou vincule um existente.</DialogDescription>
                </DialogHeader>

                {/* Se for SYSTEM, não precisa de abas, só criar */}
                {context === 'SYSTEM' ? (
                    <Form {...formCreate}>
                        <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-4">
                            <FormField control={formCreate.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={formCreate.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={formCreate.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <CommonFields form={formCreate} />
                            <DialogFooter>
                                <Button type="submit" disabled={formCreate.formState.isSubmitting}>Criar Admin</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <Tabs defaultValue="create" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="create">Criar Novo</TabsTrigger>
                            <TabsTrigger value="link">Vincular Existente</TabsTrigger>
                        </TabsList>

                        {/* ABA CRIAR */}
                        <TabsContent value="create">
                            <Form {...formCreate}>
                                <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-4">
                                    <FormField control={formCreate.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={formCreate.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={formCreate.control} name="password" render={({ field }) => (
                                        <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <CommonFields form={formCreate} />
                                    <DialogFooter>
                                        <Button type="submit" disabled={formCreate.formState.isSubmitting}>
                                            {formCreate.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Cadastrar
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* ABA VINCULAR */}
                        <TabsContent value="link">
                            <Form {...formLink}>
                                <form onSubmit={formLink.handleSubmit(onSubmitLink)} className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-xs text-blue-700 dark:text-blue-300 mb-2">
                                        Adicione um usuário que já tem conta em outra empresa (Matriz/Filial) a esta organização.
                                    </div>
                                    <FormField control={formLink.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail do Usuário</FormLabel><FormControl><Input placeholder="usuario@existente.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <CommonFields form={formLink} />
                                    <DialogFooter>
                                        <Button type="submit" variant="secondary" disabled={formLink.formState.isSubmitting}>
                                            {formLink.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                                            Vincular
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    )
}