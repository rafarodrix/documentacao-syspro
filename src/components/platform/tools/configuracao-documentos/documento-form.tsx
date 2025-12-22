'use client';

import { useDocumentoForm } from "@/hooks/use-documento-form";
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";
import { useWatch } from "react-hook-form";

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface DocumentoFormProps {
    initialValues?: DocumentoFormValues | null;
    onSave: (data: DocumentoFormValues) => void;
    onCancel: () => void;
}

export function DocumentoForm({ initialValues, onSave, onCancel }: DocumentoFormProps) {
    // Hook customizado já corrigido sem Tipagem Genérica explícita no useForm
    const form = useDocumentoForm(initialValues);

    // Verifica  o campo finalidadeNFe em tempo real para renderização condicional
    const finalidade = useWatch({ control: form.control, name: "finalidadeNFe" });

    return (
        <div className="bg-white rounded-lg shadow border p-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-semibold text-slate-800">
                    {initialValues ? "Editar Modelo de Documento" : "Novo Modelo de Documento"}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                    ID: {initialValues?.id || "Novo"}
                </span>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="grid grid-cols-12 gap-6">

                    {/* === DADOS GERAIS === */}
                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="empresa"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Empresa (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Código da empresa..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-8">
                        <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição do Modelo *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Nota Fiscal de Saída Padrão" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* === DETALHES FISCAIS BÁSICOS === */}
                    <div className="col-span-6 md:col-span-2">
                        <FormField
                            control={form.control}
                            name="modelo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Modelo *</FormLabel>
                                    <FormControl>
                                        <Input className="text-center font-mono" maxLength={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                        <FormField
                            control={form.control}
                            name="serie"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Série *</FormLabel>
                                    <FormControl>
                                        <Input className="text-center font-mono" maxLength={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="grupoDocumento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Grupo de Negócio *</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VENDA_PDV">Emissão Venda PDV</SelectItem>
                                                <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                                                <SelectItem value="FATURAMENTO">Faturamento</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="movimentaEstoque"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Movimenta Estoque?</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SAIDA">Sim (Saída)</SelectItem>
                                                <SelectItem value="ENTRADA">Sim (Entrada)</SelectItem>
                                                <SelectItem value="NAO">Não movimenta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* === REFORMA TRIBUTÁRIA (Condicional) === */}
                    <div className="col-span-12 p-5 border border-blue-100 rounded-lg bg-blue-50/50">
                        <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                            Reforma Tributária (IBS/CBS)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="finalidadeNFe"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Finalidade de Emissão</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 - NF-e normal</SelectItem>
                                                    <SelectItem value="2">2 - NF-e complementar</SelectItem>
                                                    <SelectItem value="3">3 - NF-e de ajuste</SelectItem>
                                                    <SelectItem value="4">4 - Devolução</SelectItem>
                                                    <SelectItem value="5">5 - Nota de Crédito (IBS/CBS)</SelectItem>
                                                    <SelectItem value="6">6 - Nota de Débito (IBS/CBS)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Renderização Condicional: Crédito */}
                            {finalidade === "5" && (
                                <FormField
                                    control={form.control}
                                    name="tpNFCredito"
                                    render={({ field }) => (
                                        <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                                            <FormLabel>Motivo Nota de Crédito</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Selecione o motivo..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="01">01 - Multa e juros</SelectItem>
                                                        <SelectItem value="02">02 - Crédito presumido</SelectItem>
                                                        <SelectItem value="03">03 - Retorno por recusa</SelectItem>
                                                        <SelectItem value="04">04 - Redução de valores</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Renderização Condicional: Débito */}
                            {finalidade === "6" && (
                                <FormField
                                    control={form.control}
                                    name="tpNFDebito"
                                    render={({ field }) => (
                                        <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                                            <FormLabel>Motivo Nota de Débito</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Selecione o motivo..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="01">01 - Transf. crédito Cooperativa</SelectItem>
                                                        <SelectItem value="02">02 - Anulação de Crédito</SelectItem>
                                                        <SelectItem value="03">03 - Débitos não processados</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </div>

                    {/* === CFOPS PADRÃO === */}
                    <div className="col-span-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border rounded-lg">
                            <FormField
                                control={form.control}
                                name="cfopEstadual"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CFOP Estadual (Padrão)</FormLabel>
                                        <FormControl>
                                            <Input className="font-mono bg-white" placeholder="Ex: 5102" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cfopInterestadual"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CFOP Interestadual (Padrão)</FormLabel>
                                        <FormControl>
                                            <Input className="font-mono bg-white" placeholder="Ex: 6102" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* === BOTÕES DE AÇÃO === */}
                    <div className="col-span-12 flex justify-end gap-3 mt-4 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                            Salvar Configuração
                        </Button>
                    </div>

                </form>
            </Form>
        </div>
    );
}