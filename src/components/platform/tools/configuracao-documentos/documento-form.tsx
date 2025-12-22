'use client';

import { useDocumentoForm } from "@/hooks/use-documento-form";
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";

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
import { useWatch } from "react-hook-form";

interface DocumentoFormProps {
    initialValues?: DocumentoFormValues | null;
    onSave: (data: DocumentoFormValues) => void;
    onCancel: () => void;
}

export function DocumentoForm({ initialValues, onSave, onCancel }: DocumentoFormProps) {
    const form = useDocumentoForm(initialValues);
    const finalidade = useWatch({ control: form.control, name: "finalidadeNFe" });

    return (
        <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-xl font-semibold mb-4">
                {initialValues ? "Editar Documento" : "Novo Documento"}
            </h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="grid grid-cols-12 gap-4">

                    {/* EMPRESA */}
                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="empresa"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Empresa (Ref.)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Opcional" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* DESCRIÇÃO */}
                    <div className="col-span-12 md:col-span-8">
                        <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* MODELO */}
                    <div className="col-span-6 md:col-span-2">
                        <FormField
                            control={form.control}
                            name="modelo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Modelo *</FormLabel>
                                    <FormControl>
                                        <Input className="text-center" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* SÉRIE */}
                    <div className="col-span-6 md:col-span-2">
                        <FormField
                            control={form.control}
                            name="serie"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Série *</FormLabel>
                                    <FormControl>
                                        <Input className="text-center" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* GRUPO DOCUMENTO */}
                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="grupoDocumento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Grupo Documento *</FormLabel>
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

                    {/* MOVIMENTA ESTOQUE */}
                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="movimentaEstoque"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Movimenta Estoque</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SAIDA">Saída</SelectItem>
                                                <SelectItem value="ENTRADA">Entrada</SelectItem>
                                                <SelectItem value="NAO">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* === REFORMA TRIBUTÁRIA === */}
                    <div className="col-span-12 p-4 mt-2 border rounded bg-blue-50">
                        <h3 className="text-sm font-bold mb-2">Reforma Tributária (IBS/CBS)</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Finalidade */}
                            <FormField
                                control={form.control}
                                name="finalidadeNFe"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Finalidade de Emissão</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">NF-e normal</SelectItem>
                                                    <SelectItem value="2">NF-e complementar</SelectItem>
                                                    <SelectItem value="3">NF-e de ajuste</SelectItem>
                                                    <SelectItem value="4">Devolução</SelectItem>
                                                    <SelectItem value="5">Nota de Crédito (IBS/CBS)</SelectItem>
                                                    <SelectItem value="6">Nota de Débito (IBS/CBS)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Motivo Crédito */}
                            {finalidade === "5" && (
                                <FormField
                                    control={form.control}
                                    name="tpNFCredito"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Motivo Nota de Crédito</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="01">Multa e juros</SelectItem>
                                                        <SelectItem value="02">Crédito presumido</SelectItem>
                                                        <SelectItem value="03">Retorno por recusa</SelectItem>
                                                        <SelectItem value="04">Redução de valores</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Motivo Débito */}
                            {finalidade === "6" && (
                                <FormField
                                    control={form.control}
                                    name="tpNFDebito"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Motivo Nota de Débito</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="01">Transf. crédito Cooperativa</SelectItem>
                                                        <SelectItem value="02">Anulação de Crédito</SelectItem>
                                                        <SelectItem value="03">Débitos não processados</SelectItem>
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

                    {/* CFOPs */}
                    <div className="col-span-12 grid grid-cols-2 gap-4 bg-slate-50 p-4 border rounded mt-2">
                        <FormField
                            control={form.control}
                            name="cfopEstadual"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CFOP Estadual</FormLabel>
                                    <FormControl>
                                        <Input className="font-mono" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="cfopInterestadual"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CFOP Interestadual</FormLabel>
                                    <FormControl>
                                        <Input className="font-mono" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Ações */}
                    <div className="col-span-12 flex justify-end gap-2 mt-4 border-t pt-4">
                        <Button variant="outline" type="button" onClick={onCancel}>
                            Cancelar
                        </Button>

                        <Button type="submit">
                            Salvar Configuração
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
