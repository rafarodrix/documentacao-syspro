"use client"

import { useEffect } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { updateCompanyAction } from "@/actions/admin/company-actions"
import { TaxRegime } from "@prisma/client"
import { toast } from "sonner"
import { formatCNPJ, formatCEP, formatPhone } from "@/lib/formatters" // <--- Certifique-se que este arquivo existe

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
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Building2, MapPin, FileText, Plus, Save } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface EditCompanyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    company: any
}

export function EditCompanyDialog({ open, onOpenChange, company }: EditCompanyDialogProps) {

    const form = useForm<any>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            razaoSocial: "", nomeFantasia: "", cnpj: "",
            emailContato: "", emailFinanceiro: "", telefone: "", website: "",
            inscricaoEstadual: "", inscricaoMunicipal: "", cnae: "", codSuframa: "",
            regimeTributario: undefined,
            cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
            observacoes: "",
        }
    })

    const { isSubmitting } = form.formState

    // Efeito: Preenche o formulário quando a empresa selecionada muda
    useEffect(() => {
        if (company) {
            form.reset({
                razaoSocial: company.razaoSocial || "",
                nomeFantasia: company.nomeFantasia || "",
                cnpj: company.cnpj || "",
                emailContato: company.emailContato || "",
                emailFinanceiro: company.emailFinanceiro || "",
                telefone: company.telefone || "",
                website: company.website || "",
                inscricaoEstadual: company.inscricaoEstadual || "",
                inscricaoMunicipal: company.inscricaoMunicipal || "",
                cnae: company.cnae || "",
                codSuframa: company.codSuframa || "",
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

    const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
        if (!company) return

        const result = await updateCompanyAction(company.id, data)

        if (result.success) {
            toast.success("Dados atualizados com sucesso!")
            onOpenChange(false)
        } else {
            // Tratamento seguro do erro
            if (typeof result.error === "string") {
                toast.error(result.error)
            } else {
                toast.error("Verifique os dados do formulário.")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2 bg-muted/30 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" /> Editar Empresa
                    </DialogTitle>
                    <DialogDescription>
                        Atualizando cadastro de <strong>{company?.razaoSocial}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">

                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <Tabs defaultValue="principal" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4 mb-6">
                                        <TabsTrigger value="principal" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" /> Principal</TabsTrigger>
                                        <TabsTrigger value="fiscal" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Fiscal</TabsTrigger>
                                        <TabsTrigger value="contato" className="gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" /> Endereço</TabsTrigger>
                                        <TabsTrigger value="extras" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Extras</TabsTrigger>
                                    </TabsList>

                                    {/* --- TAB 1: DADOS PRINCIPAIS --- */}
                                    <TabsContent value="principal" className="space-y-4 mt-0">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="cnpj" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>CNPJ *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="00.000.000/0000-00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                                                            maxLength={18}
                                                            value={field.value || ""}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Razão Social *</FormLabel>
                                                    <FormControl><Input placeholder="Razão Social Ltda" {...field} value={field.value || ""} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome Fantasia</FormLabel>
                                                <FormControl><Input placeholder="Nome Comercial" {...field} value={field.value || ""} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </TabsContent>

                                    {/* --- TAB 2: DADOS FISCAIS --- */}
                                    <TabsContent value="fiscal" className="space-y-4 mt-0">
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
                                        )} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                                <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input placeholder="ISENTO ou número" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                                                <FormItem><FormLabel>Inscrição Municipal</FormLabel><FormControl><Input placeholder="Número" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="cnae" render={({ field }) => (
                                                <FormItem><FormLabel>CNAE Principal</FormLabel><FormControl><Input placeholder="0000-0/00" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="codSuframa" render={({ field }) => (
                                                <FormItem><FormLabel>Cód. Suframa</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </TabsContent>

                                    {/* --- TAB 3: ENDEREÇO & CONTATO --- */}
                                    <TabsContent value="contato" className="space-y-5 mt-0">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="emailContato" render={({ field }) => (
                                                <FormItem><FormLabel>E-mail Comercial</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="emailFinanceiro" render={({ field }) => (
                                                <FormItem><FormLabel>E-mail NFe/Financeiro</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="telefone" render={({ field }) => (
                                                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} maxLength={15} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>

                                        <div className="h-px bg-border/50" />

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-4 gap-3">
                                                <FormField control={form.control} name="cep" render={({ field }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel>CEP</FormLabel>
                                                        <FormControl><Input maxLength={9} {...field} onChange={(e) => field.onChange(formatCEP(e.target.value))} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="logradouro" render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel>Logradouro</FormLabel>
                                                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <FormField control={form.control} name="numero" render={({ field }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel>Número</FormLabel>
                                                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="complemento" render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel>Complemento</FormLabel>
                                                        <FormControl><Input placeholder="Apto, Sala..." {...field} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <FormField control={form.control} name="bairro" render={({ field }) => (
                                                    <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={form.control} name="cidade" render={({ field }) => (
                                                    <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={form.control} name="estado" render={({ field }) => (
                                                    <FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} className="uppercase" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* --- TAB 4: EXTRAS --- */}
                                    <TabsContent value="extras" className="space-y-4 mt-0">
                                        <FormField control={form.control} name="website" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Website</FormLabel>
                                                <FormControl><Input placeholder="https://..." {...field} value={field.value || ""} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="observacoes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Observações Internas</FormLabel>
                                                <FormControl>
                                                    <Textarea className="resize-none min-h-[100px]" {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}