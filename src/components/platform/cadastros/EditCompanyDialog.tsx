"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { updateCompanyAction } from "@/actions/admin/company-actions"
import { TaxRegime } from "@prisma/client"
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

// Helper CNPJ
const formatCNPJ = (value: string) => {
    return value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").substr(0, 18)
}

interface EditCompanyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    company: any // Prisma Company Payload
}

export function EditCompanyDialog({ open, onOpenChange, company }: EditCompanyDialogProps) {

    const form = useForm<any>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            razaoSocial: "", nomeFantasia: "", cnpj: "", emailContato: "",
            telefone: "", website: "", inscricaoEstadual: "", inscricaoMunicipal: "",
            cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
            observacoes: "", regimeTributario: undefined,
        }
    })

    // Popula o formulário quando a empresa muda ou o modal abre
    useEffect(() => {
        if (company) {
            form.reset({
                razaoSocial: company.razaoSocial || "",
                nomeFantasia: company.nomeFantasia || "",
                cnpj: company.cnpj || "",
                emailContato: company.emailContato || "",
                telefone: company.telefone || "",
                website: company.website || "",
                inscricaoEstadual: company.inscricaoEstadual || "",
                inscricaoMunicipal: company.inscricaoMunicipal || "",
                regimeTributario: company.regimeTributario || undefined,
                cep: company.cep || "",
                logradouro: company.logradouro || "",
                numero: company.numero || "",
                complemento: company.complemento || "",
                bairro: company.bairro || "",
                cidade: company.cidade || "",
                estado: company.estado || "",
                observacoes: company.observacoes || "",
            })
        }
    }, [company, form])

    async function onSubmit(data: CreateCompanyInput) {
        if (!company) return

        const result = await updateCompanyAction(company.id, data)

        if (result.success) {
            toast.success("Dados atualizados com sucesso!")
            onOpenChange(false)
        } else {
            if (typeof result.error === "string") {
                toast.error(result.error)
            } else {
                toast.error("Verifique os dados do formulário.")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Editar Empresa</DialogTitle>
                    <DialogDescription>Atualize os dados cadastrais de {company?.razaoSocial}.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* DADOS BÁSICOS */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Dados Principais</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ</FormLabel>
                                            <FormControl>
                                                <Input {...field} onChange={(e) => field.onChange(formatCNPJ(e.target.value))} maxLength={18} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="emailContato" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                    <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                    <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            {/* FISCAL */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Fiscal</h4>
                                <FormField control={form.control} name="regimeTributario" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Regime Tributário</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value={TaxRegime.SIMPLES_NACIONAL}>Simples Nacional</SelectItem>
                                                <SelectItem value={TaxRegime.SIMPLES_NACIONAL_EXCESSO}>Simples Nacional (Excesso)</SelectItem>
                                                <SelectItem value={TaxRegime.LUCRO_PRESUMIDO}>Lucro Presumido</SelectItem>
                                                <SelectItem value={TaxRegime.LUCRO_REAL}>Lucro Real</SelectItem>
                                                <SelectItem value={TaxRegime.MEI}>MEI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>

                            {/* ENDEREÇO SIMPLIFICADO */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Endereço</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="cep" render={({ field }) => (
                                        <FormItem><FormLabel>CEP</FormLabel><FormControl><Input maxLength={9} {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="col-span-2">
                                        <FormField control={form.control} name="cidade" render={({ field }) => (
                                            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                                </Button>
                            </div>

                        </form>
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}