"use client"

import { useEffect } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { updateCompanyAction } from "@/actions/admin/company-actions"
import { TaxRegime, IndicadorIE, CompanyStatus } from "@prisma/client"
import { toast } from "sonner"
import { formatCNPJ, formatPhone } from "@/lib/formatters"
import { useAddressLookup } from "@/hooks/use-address-lookup"

import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
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
import { Textarea } from "@/components/ui/textarea"
import {
    Loader2, Building2, MapPin, FileText, Save, Globe, Mail,
    Phone as PhoneIcon, Landmark, ImageIcon, Calendar, Hash
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface EditCompanyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    company: any // Idealmente Company & { addresses: Address[] }
}

export function EditCompanyDialog({ open, onOpenChange, company }: EditCompanyDialogProps) {
    const form = useForm<CreateCompanyInput>({
        resolver: zodResolver(createCompanySchema) as any,
        defaultValues: {
            cnpj: "",
            razaoSocial: "",
            nomeFantasia: "",
            address: {
                description: "Sede",
                cep: "",
                logradouro: "",
                numero: "",
                complemento: "",
                bairro: "",
                cidade: "",
                estado: "",
                pais: "BR",
                codigoIbgeCidade: "",
                codigoIbgeEstado: ""
            }
        }
    })

    const { isSubmitting } = form.formState
    const { isLoadingCep, handleCepChange } = useAddressLookup(form.setValue)

    // Sincroniza os dados do banco com o formulário ao abrir
    useEffect(() => {
        if (company && open) {
            const mainAddress = company.addresses?.[0] || company.address || {}

            form.reset({
                cnpj: formatCNPJ(company.cnpj),
                razaoSocial: company.razaoSocial || "",
                nomeFantasia: company.nomeFantasia || "",
                logoUrl: company.logoUrl || "",
                status: company.status || CompanyStatus.ACTIVE,
                indicadorIE: company.indicadorIE || IndicadorIE.NAO_CONTRIBUINTE,
                regimeTributario: company.regimeTributario || undefined,
                inscricaoEstadual: company.inscricaoEstadual || "",
                inscricaoMunicipal: company.inscricaoMunicipal || "",
                crt: company.crt || "",
                cnae: company.cnae || "",
                codSuframa: company.codSuframa || "",
                dataFundacao: company.dataFundacao ? new Date(company.dataFundacao) : undefined,
                emailContato: company.emailContato || "",
                emailFinanceiro: company.emailFinanceiro || "",
                telefone: company.telefone || "",
                whatsapp: company.whatsapp || "",
                website: company.website || "",
                observacoes: company.observacoes || "",
                parentCompanyId: company.parentCompanyId || "",
                accountingFirmId: company.accountingFirmId || "",
                address: {
                    description: mainAddress.description || "Sede",
                    cep: mainAddress.cep || "",
                    logradouro: mainAddress.logradouro || "",
                    numero: mainAddress.numero || "",
                    complemento: mainAddress.complemento || "",
                    bairro: mainAddress.bairro || "",
                    cidade: mainAddress.cidade || mainAddress.city || "",
                    estado: mainAddress.estado || mainAddress.state || "",
                    pais: mainAddress.pais || "BR",
                    codigoIbgeCidade: mainAddress.codigoIbgeCidade || "",
                    codigoIbgeEstado: mainAddress.codigoIbgeEstado || ""
                }
            })
        }
    }, [company, open, form])

    const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
        if (!company?.id) return
        const result = await updateCompanyAction(company.id, data)

        if (result.success) {
            toast.success("Empresa atualizada com sucesso!")
            onOpenChange(false)
        } else {
            if (result.errors) {
                Object.entries(result.errors).forEach(([key, messages]) => {
                    form.setError(key as any, { type: "manual", message: messages[0] })
                })
            } else {
                toast.error(result.message || "Erro ao atualizar empresa.")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[95vh] p-0 flex flex-col overflow-hidden border-border/50">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Building2 className="w-6 h-6 text-primary" /> Editar Organização
                    </DialogTitle>
                    <DialogDescription>
                        Atualize as informações cadastrais e fiscais da unidade <strong>{company?.nomeFantasia || company?.razaoSocial}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <Tabs defaultValue="geral" className="w-full">
                                    <TabsList className="grid w-full grid-cols-5 mb-8 bg-muted/50 p-1 h-auto text-[10px] md:text-xs">
                                        <TabsTrigger value="geral" className="gap-2 py-2"><Building2 className="w-3.5 h-3.5" /> Geral</TabsTrigger>
                                        <TabsTrigger value="fiscal" className="gap-2 py-2"><FileText className="w-3.5 h-3.5" /> Fiscal</TabsTrigger>
                                        <TabsTrigger value="estrutura" className="gap-2 py-2"><Landmark className="w-3.5 h-3.5" /> Estrutura</TabsTrigger>
                                        <TabsTrigger value="endereco" className="gap-2 py-2"><MapPin className="w-3.5 h-3.5" /> Endereço</TabsTrigger>
                                        <TabsTrigger value="contato" className="gap-2 py-2"><PhoneIcon className="w-3.5 h-3.5" /> Contato</TabsTrigger>
                                    </TabsList>

                                    {/* --- GERAL --- */}
                                    <TabsContent value="geral" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="cnpj" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold">CNPJ *</FormLabel>
                                                    <FormControl><Input {...field} value={(field.value as string) ?? ""} onChange={(e) => field.onChange(formatCNPJ(e.target.value))} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="dataFundacao" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Fundação</FormLabel>
                                                    <FormControl><Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : (field.value as string ?? "")} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold">Razão Social *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold">Nome Fantasia</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                            <FormItem><FormLabel className="font-semibold flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> URL Logomarca</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </TabsContent>

                                    {/* --- FISCAL --- */}
                                    <TabsContent value="fiscal" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="regimeTributario" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold">Regime Tributário</FormLabel>
                                                    <Select onValueChange={field.onChange} value={(field.value as string) ?? undefined}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                        <SelectContent>{Object.values(TaxRegime).map(r => (<SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="crt" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold">CRT (Regime Tributário)</FormLabel>
                                                    <Select onValueChange={field.onChange} value={(field.value as string) ?? undefined}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o CRT..." /></SelectTrigger></FormControl>
                                                        <SelectContent><SelectItem value="1">1 - Simples Nacional</SelectItem><SelectItem value="2">2 - Simples (Excesso)</SelectItem><SelectItem value="3">3 - Regime Normal</SelectItem><SelectItem value="4">4 - Simples (MEI)</SelectItem></SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="indicadorIE" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold">Contribuinte ICMS</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value as string}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent><SelectItem value={IndicadorIE.CONTRIBUINTE}>Contribuinte</SelectItem><SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>Não Contribuinte</SelectItem><SelectItem value={IndicadorIE.ISENTO}>Isento</SelectItem></SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Inscrição Estadual</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Inscrição Municipal</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                        </div>
                                    </TabsContent>

                                    {/* --- ESTRUTURA --- */}
                                    <TabsContent value="estrutura" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="parentCompanyId" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Matriz (ID)</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="accountingFirmId" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Contabilidade (ID)</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                        </div>
                                    </TabsContent>

                                    {/* --- ENDEREÇO --- */}
                                    <TabsContent value="endereco" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="address.cep" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold">CEP *</FormLabel><div className="relative"><FormControl>
                                                    <Input {...field} value={(field.value as string) ?? ""} onChange={(e) => handleCepChange(e.target.value)} disabled={isLoadingCep} />
                                                </FormControl>{isLoadingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}</div></FormItem>
                                            )} />
                                            <div className="md:col-span-2"><FormField control={form.control} name="address.logradouro" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Logradouro *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} /></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="address.bairro" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Bairro *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="address.cidade" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Cidade *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="address.estado" render={({ field }) => (<FormItem><FormLabel className="font-semibold">UF *</FormLabel><FormControl><Input maxLength={2} className="uppercase" {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                            <FormField control={form.control} name="address.codigoIbgeCidade" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-xs flex items-center gap-1.5"><Hash className="w-3 h-3" /> Cód. IBGE Cidade</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="address.codigoIbgeEstado" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-xs flex items-center gap-1.5"><Hash className="w-3 h-3" /> Cód. IBGE UF</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                        </div>
                                    </TabsContent>

                                    {/* --- CONTATO --- */}
                                    <TabsContent value="contato" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="emailContato" render={({ field }) => (<FormItem><FormLabel className="font-semibold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> E-mail Comercial</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel className="font-semibold flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" /> Telefone</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl></FormItem>)} />
                                        </div>
                                        <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Observações Internas</FormLabel><FormControl><Textarea className="resize-none min-h-[80px]" {...field} value={(field.value as string) ?? ""} /></FormControl></FormItem>)} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>

                        <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[150px] font-bold">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}