"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { createCompanyAction } from "@/actions/admin/company-actions"
import { TaxRegime, IndicadorIE, CompanyStatus } from "@prisma/client"
import { toast } from "sonner"
import { formatCNPJ, formatPhone } from "@/lib/formatters"
import { useAddressLookup } from "@/hooks/use-address-lookup"

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
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
    Plus, Loader2, Building2, MapPin, FileText, Phone as PhoneIcon,
    Globe, Mail, Landmark, Image as ImageIcon, Calendar, Hash
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CreateCompanyDialog() {
    const [open, setOpen] = useState(false)

    const form = useForm<CreateCompanyInput>({
        resolver: zodResolver(createCompanySchema) as any,
        defaultValues: {
            cnpj: "",
            razaoSocial: "",
            nomeFantasia: "",
            logoUrl: "",
            status: CompanyStatus.ACTIVE,
            indicadorIE: IndicadorIE.NAO_CONTRIBUINTE,
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

    const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
        try {
            const result = await createCompanyAction(data)
            if (result.success) {
                toast.success(result.message || "Empresa cadastrada com sucesso!")
                setOpen(false)
                form.reset()
            } else if (result.errors) {
                Object.entries(result.errors).forEach(([key, messages]) => {
                    form.setError(key as any, { type: "manual", message: messages[0] })
                })
                toast.error("Verifique os campos destacados.")
            } else {
                toast.error(result.message || "Erro ao salvar empresa.")
            }
        } catch (error) {
            toast.error("Erro inesperado ao salvar.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-2 shadow-sm font-semibold">
                    <Plus className="h-4 w-4" /> Nova Empresa
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[800px] max-h-[95vh] p-0 flex flex-col overflow-hidden border-border/50 shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Building2 className="w-6 h-6 text-primary" /> Cadastro de Organização
                    </DialogTitle>
                    <DialogDescription>Preencha os dados cadastrais e fiscais da nova unidade.</DialogDescription>
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
                                                    <FormLabel className="font-semibold text-sm">CNPJ *</FormLabel>
                                                    <FormControl><Input placeholder="00.000.000/0000-00" {...field} value={(field.value as string) ?? ""} onChange={(e) => field.onChange(formatCNPJ(e.target.value))} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="dataFundacao" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Fundação</FormLabel>
                                                    <FormControl><Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : (field.value as string ?? "")} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-sm">Razão Social *</FormLabel>
                                                    <FormControl><Input placeholder="Nome Jurídico" {...field} value={(field.value as string) ?? ""} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-sm">Nome Fantasia</FormLabel>
                                                    <FormControl><Input placeholder="Nome Comercial" {...field} value={(field.value as string) ?? ""} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-sm flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> URL da Logomarca</FormLabel>
                                                <FormControl><Input placeholder="https://exemplo.com/logo.png" {...field} value={(field.value as string) ?? ""} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </TabsContent>

                                    {/* --- FISCAL --- */}
                                    <TabsContent value="fiscal" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="regimeTributario" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-sm">Regime Tributário</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value as string ?? undefined}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                        <SelectContent>{Object.values(TaxRegime).map(r => (<SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="crt" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-sm">CRT (Regime Tributário)</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value as string ?? undefined}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o CRT..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="1">1 - Simples Nacional</SelectItem>
                                                            <SelectItem value="2">2 - Simples (Excesso de Sublimite)</SelectItem>
                                                            <SelectItem value="3">3 - Regime Normal</SelectItem>
                                                            <SelectItem value="4">4 - Simples Nacional (MEI)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="indicadorIE" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-sm">Contribuinte ICMS</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value as string}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value={IndicadorIE.CONTRIBUINTE}>Contribuinte</SelectItem>
                                                            <SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>Não Contribuinte</SelectItem>
                                                            <SelectItem value={IndicadorIE.ISENTO}>Isento</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-sm">Inscrição Estadual</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-sm">Inscrição Municipal</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <FormField control={form.control} name="cnae" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">CNAE Principal</FormLabel><FormControl><Input placeholder="00.00-0-00" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="codSuframa" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Cód. Suframa</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </TabsContent>

                                    {/* --- ESTRUTURA --- */}
                                    <TabsContent value="estrutura" className="space-y-4 outline-none">
                                        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                                            Defina as relações de hierarquia e responsabilidade contábil.
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="parentCompanyId" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-sm">Empresa Matriz (ID)</FormLabel><FormControl><Input placeholder="ID da unidade principal" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="accountingFirmId" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-sm">Escritório Contábil (ID)</FormLabel><FormControl><Input placeholder="ID da contabilidade" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </TabsContent>

                                    {/* --- ENDEREÇO --- */}
                                    <TabsContent value="endereco" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="address.cep" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-sm">CEP *</FormLabel><div className="relative">
                                                    <FormControl><Input {...field} value={(field.value as string) ?? ""} onChange={(e) => handleCepChange(e.target.value)} disabled={isLoadingCep} /></FormControl>
                                                    {isLoadingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                                                </div><FormMessage /></FormItem>
                                            )} />
                                            <div className="md:col-span-2">
                                                <FormField control={form.control} name="address.logradouro" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-semibold text-sm">Logradouro *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <FormField control={form.control} name="address.numero" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm">Número *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="md:col-span-3">
                                                <FormField control={form.control} name="address.complemento" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm">Complemento</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="address.bairro" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm">Bairro *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="address.cidade" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm">Cidade *</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="address.estado" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm">UF *</FormLabel><FormControl><Input maxLength={2} className="uppercase" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>

                                        {/* CAMPOS IBGE - Fiscais */}
                                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                            <FormField control={form.control} name="address.codigoIbgeCidade" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-xs flex items-center gap-1.5"><Hash className="w-3 h-3" /> Cód. IBGE Cidade</FormLabel><FormControl><Input placeholder="0000000" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="address.codigoIbgeEstado" render={({ field }) => (
                                                <FormItem><FormLabel className="font-semibold text-xs flex items-center gap-1.5"><Hash className="w-3 h-3" /> Cód. IBGE UF</FormLabel><FormControl><Input placeholder="00" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </TabsContent>

                                    {/* --- CONTATO --- */}
                                    <TabsContent value="contato" className="space-y-4 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="emailContato" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> E-mail Comercial</FormLabel><FormControl><Input placeholder="comercial@empresa.com" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="emailFinanceiro" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail Financeiro</FormLabel><FormControl><Input placeholder="financeiro@empresa.com" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" /> Telefone</FormLabel><FormControl><Input {...field} value={(field.value as string) ?? ""} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</FormLabel><FormControl><Input placeholder="https://..." {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel className="font-semibold text-sm">Observações Internas</FormLabel><FormControl><Textarea className="resize-none min-h-[80px]" {...field} value={(field.value as string) ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="px-6 py-4 bg-muted/20 border-t flex items-center justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[150px] font-bold">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Cadastro"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}