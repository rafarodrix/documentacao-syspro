'use client';

import { useDocumentoForm } from "@/hooks/use-documento-form";
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento";

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
    const form = useDocumentoForm(initialValues);

    // Removi o useWatch pois a lógica condicional da Reforma Tributária foi retirada.

    return (
        <div className="bg-card text-card-foreground rounded-lg shadow border border-border p-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-semibold">
                    {initialValues ? "Editar Modelo de Documento" : "Novo Modelo de Documento"}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
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
                                        <Input placeholder="Código da empresa..." className="bg-background" {...field} />
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
                                        <Input placeholder="Ex: Nota Fiscal de Saída Padrão" className="bg-background" {...field} />
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
                                        <Input className="text-center font-mono bg-background" maxLength={2} {...field} />
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
                                        <Input className="text-center font-mono bg-background" maxLength={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* === GRUPOS (Via Constante) === */}
                    <div className="col-span-12 md:col-span-4">
                        <FormField
                            control={form.control}
                            name="grupoDocumento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Grupo de Negócio *</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="bg-background">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>

                                            {/* Adicionado max-h-[300px] para scroll se a lista for grande */}
                                            <SelectContent className="max-h-[300px]">
                                                {GRUPOS_DOCUMENTO.map((grupo, index) => (
                                                    <SelectItem
                                                        // Usando index como fallback para garantir key única se houver códigos duplicados
                                                        key={`${grupo.value}-${index}`}
                                                        value={grupo.value}
                                                    >
                                                        <span className="font-mono font-bold mr-2">{grupo.value}</span>
                                                        - {grupo.label}
                                                    </SelectItem>
                                                ))}
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
                                            <SelectTrigger className="bg-background">
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

                    {/* === CFOPS PADRÃO === */}
                    <div className="col-span-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 border border-border rounded-lg">
                            <FormField
                                control={form.control}
                                name="cfopEstadual"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CFOP Estadual (Padrão)</FormLabel>
                                        <FormControl>
                                            <Input className="font-mono bg-background" placeholder="Ex: 5102" {...field} />
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
                                            <Input className="font-mono bg-background" placeholder="Ex: 6102" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* === BOTÕES DE AÇÃO === */}
                    <div className="col-span-12 flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                        <Button variant="outline" type="button" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 min-w-[150px] text-white">
                            Salvar Configuração
                        </Button>
                    </div>

                </form>
            </Form>
        </div>
    );
}