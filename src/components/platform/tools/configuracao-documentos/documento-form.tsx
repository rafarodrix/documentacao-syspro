'use client';

import { useDocumentoForm } from "@/hooks/use-documento-form";
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento";
import { COMPORTAMENTOS_DOCUMENTO } from "@/core/constants/comportamentos-documento";
import { TIPOS_NOTA_CREDITO, TIPOS_NOTA_DEBITO } from "@/core/constants/tipos-notas"; // <--- Import Novo
import { useWatch } from "react-hook-form"; // <--- Import Necessário

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentoFormProps {
    initialValues?: DocumentoFormValues | null;
    onSave: (data: DocumentoFormValues) => void;
    onCancel: () => void;
}

export function DocumentoForm({ initialValues, onSave, onCancel }: DocumentoFormProps) {
    const form = useDocumentoForm(initialValues);

    // Monitora a finalidade para exibir campos condicionais
    const finalidade = useWatch({ control: form.control, name: "finalidadeNFe" });

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
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">

                    <Tabs defaultValue="geral" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                            <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
                            <TabsTrigger value="comportamentos">Comportamentos</TabsTrigger>
                        </TabsList>

                        {/* === ABA 1: DADOS GERAIS === */}
                        <TabsContent value="geral" className="mt-6">
                            <div className="grid grid-cols-12 gap-6">

                                {/* Empresa */}
                                <div className="col-span-12 md:col-span-4">
                                    <FormField
                                        control={form.control}
                                        name="empresa"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Empresa (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Código..." className="bg-background" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Descrição */}
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

                                {/* Modelo e Série */}
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

                                {/* Movimenta Estoque */}
                                <div className="col-span-12 md:col-span-8">
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

                                {/* === FINALIDADE NFE (ATUALIZADO) === */}
                                <div className="col-span-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-border rounded-lg bg-muted/20">
                                        <FormField
                                            control={form.control}
                                            name="finalidadeNFe"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Finalidade NFe</FormLabel>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <SelectTrigger className="bg-background">
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
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* CONDICIONAL: Tipo de Nota de CRÉDITO (5) */}
                                        {finalidade === "5" && (
                                            <FormField
                                                control={form.control}
                                                name="tpNFCredito"
                                                render={({ field }) => (
                                                    <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                                                        <FormLabel>Tipo de Nota de Crédito</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <SelectTrigger className="bg-background">
                                                                    <SelectValue placeholder="Selecione o motivo..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {TIPOS_NOTA_CREDITO.map((item) => (
                                                                        <SelectItem key={item.value} value={item.value}>
                                                                            {item.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* CONDICIONAL: Tipo de Nota de DÉBITO (6) */}
                                        {finalidade === "6" && (
                                            <FormField
                                                control={form.control}
                                                name="tpNFDebito"
                                                render={({ field }) => (
                                                    <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                                                        <FormLabel>Tipo de Nota de Débito</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <SelectTrigger className="bg-background">
                                                                    <SelectValue placeholder="Selecione o motivo..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {TIPOS_NOTA_DEBITO.map((item) => (
                                                                        <SelectItem key={item.value} value={item.value}>
                                                                            {item.label}
                                                                        </SelectItem>
                                                                    ))}
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

                                {/* Grupo de Documento */}
                                <div className="col-span-12">
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
                                                        <SelectContent className="max-h-[300px]">
                                                            {GRUPOS_DOCUMENTO.map((grupo, index) => (
                                                                <SelectItem
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

                                {/* CFOPs */}
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
                            </div>
                        </TabsContent>

                        {/* === ABA 2: COMPORTAMENTOS === */}
                        <TabsContent value="comportamentos" className="mt-6">
                            <div className="bg-muted/30 border border-border rounded-lg p-4">
                                <div className="mb-4">
                                    <h3 className="text-sm font-medium">Regras de Negócio e Automação</h3>
                                    <p className="text-xs text-muted-foreground">Selecione os comportamentos que este documento deve executar automaticamente.</p>
                                </div>

                                <ScrollArea className="h-[400px] pr-4">
                                    <FormField
                                        control={form.control}
                                        name="comportamentos"
                                        render={() => (
                                            <FormItem>
                                                <div className="space-y-2">
                                                    {COMPORTAMENTOS_DOCUMENTO.map((item) => (
                                                        <FormField
                                                            key={item.id}
                                                            control={form.control}
                                                            name="comportamentos"
                                                            render={({ field }) => {
                                                                return (
                                                                    <FormItem
                                                                        key={item.id}
                                                                        className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-3 bg-card hover:bg-muted/50 transition-colors"
                                                                    >
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(item.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                        ? field.onChange([...(field.value || []), item.id])
                                                                                        : field.onChange(
                                                                                            field.value?.filter(
                                                                                                (value: string) => value !== item.id
                                                                                            )
                                                                                        )
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <div className="space-y-1 leading-none cursor-pointer" onClick={() => {
                                                                            const checked = !field.value?.includes(item.id);
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), item.id])
                                                                                : field.onChange(field.value?.filter((v: string) => v !== item.id))
                                                                        }}>
                                                                            <FormLabel className="font-bold text-primary cursor-pointer">
                                                                                {item.id}
                                                                            </FormLabel>
                                                                            <FormDescription className="cursor-pointer">
                                                                                {item.label}
                                                                            </FormDescription>
                                                                        </div>
                                                                    </FormItem>
                                                                )
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </ScrollArea>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* === BOTÕES DE AÇÃO === */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
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