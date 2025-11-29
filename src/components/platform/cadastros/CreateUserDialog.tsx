"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema"
import { createUserAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserPlus, Loader2 } from "lucide-react"

interface CreateUserDialogProps {
    companies: any[] // Lista de empresas para o select
    isAdmin: boolean // Se é Super Admin
}

export function CreateUserDialog({ companies, isAdmin }: CreateUserDialogProps) {
    const [open, setOpen] = useState(false)

    // Se não for admin (é cliente), já pegamos o ID da primeira empresa (a dele)
    const defaultCompanyId = !isAdmin && companies.length > 0 ? companies[0].id : ""

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "", // Senha inicial
            role: Role.CLIENTE_USER,
            companyId: defaultCompanyId
        }
    })

    const { isSubmitting } = form.formState

    async function onSubmit(data: CreateUserInput) {
        // Se for cliente, força o ID da empresa dele mesmo que o form tenha perdido
        if (!isAdmin && defaultCompanyId) {
            data.companyId = defaultCompanyId
        }

        const result = await createUserAction(data)

        if (result.success) {
            toast.success("Usuário criado com sucesso!")
            setOpen(false)
            form.reset()
        } else {
            toast.error(result.error || "Erro ao criar usuário")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-2">
                    <UserPlus className="h-4 w-4" />
                    {isAdmin ? "Criar Usuário" : "Convidar Membro"}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Crie um novo acesso para a plataforma. O usuário poderá alterar a senha depois.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

                        {/* Nome */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: João da Silva" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-mail Corporativo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="joao@empresa.com" type="email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Senha Inicial */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha Inicial</FormLabel>
                                    <FormControl>
                                        <Input placeholder="******" type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Cargo (Role) */}
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nível de Acesso</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                            {/* Empresa (Apenas Admin vê o Select, mas o campo existe oculto para Client) */}
                            {isAdmin ? (
                                <FormField
                                    control={form.control}
                                    name="companyId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Empresa</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione a empresa" />
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
                                // Campo visualmente desabilitado/fixo para o Cliente ver onde está criando
                                <div className="space-y-2 opacity-70">
                                    <FormLabel>Empresa</FormLabel>
                                    <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted text-muted-foreground flex items-center">
                                        {companies[0]?.nomeFantasia || "Minha Empresa"}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Cadastrar Usuário
                            </Button>
                        </DialogFooter>

                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}