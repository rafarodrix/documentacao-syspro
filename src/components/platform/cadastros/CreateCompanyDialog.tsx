"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { createCompanyAction } from "@/actions/admin/company-actions"
import { TaxRegime } from "@prisma/client"
import { toast } from "sonner"
import { formatCNPJ, formatCEP, formatPhone } from "@/lib/formatters"

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
import { Plus, Loader2, Building2, MapPin, FileText, Phone as PhoneIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CreateCompanyDialog() {
    const [open, setOpen] = useState(false)

    const form = useForm<any>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            razaoSocial: "", nomeFantasia: "", cnpj: "",
            emailContato: "", telefone: "", website: "",
            inscricaoEstadual: "", inscricaoMunicipal: "", regimeTributario: undefined,
            cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
            observacoes: "",
        }
    })

    const { isSubmitting } = form.formState

    const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
        const result = await createCompanyAction(data)
        if (result.success) {
            toast.success("Empresa cadastrada com sucesso!")
            setOpen(false)
            form.reset()
        } else {
            if (typeof result.error === "string") toast.error(result.error)
            else toast.error("Verifique os dados do formulário.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-2 shadow-md transition-transform hover:scale-[1.02]">
                    <Plus className="h-4 w-4" /> Nova Empresa
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2 bg-muted/30 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" /> Nova Organização
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os dados cadastrais completos da empresa.
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
                                                        <Input placeholder="00.000.000/0000-00" {...field} onChange={(e) => field.onChange(formatCNPJ(e.target.value))} maxLength={18} value={field.value || ""} />
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    </TabsContent>

                                    {/* --- TAB 3: ENDEREÇO & CONTATO --- */}
                                    <TabsContent value="contato" className="space-y-5 mt-0">
                                        {/* Contato Rápido */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="emailContato" render={({ field }) => (
                                                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@empresa.com" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="telefone" render={({ field }) => (
                                                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} maxLength={15} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>

                                        <div className="h-px bg-border/50" />

                                        {/* Endereço Completo */}
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-4 gap-3">
                                                <FormField control={form.control} name="cep" render={({ field }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel>CEP</FormLabel>
                                                        <FormControl><Input placeholder="00000-000" maxLength={9} {...field} onChange={(e) => field.onChange(formatCEP(e.target.value))} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="logradouro" render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel>Logradouro</FormLabel>
                                                        <FormControl><Input placeholder="Rua, Av..." {...field} value={field.value || ""} /></FormControl>
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
                                                    <FormItem>
                                                        <FormLabel>Bairro</FormLabel>
                                                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="cidade" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cidade</FormLabel>
                                                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="estado" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>UF</FormLabel>
                                                        <FormControl><Input placeholder="SP" maxLength={2} className="uppercase" {...field} value={field.value || ""} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
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
                                                    <Textarea placeholder="Detalhes adicionais sobre a empresa..." className="resize-none min-h-[100px]" {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Cadastrar"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}