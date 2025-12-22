'use client';

import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useDocumentoForm } from "@/hooks/use-documento-form";
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento";
import { COMPORTAMENTOS_DOCUMENTO } from "@/core/constants/comportamentos-documento";
import { TIPOS_NOTA_CREDITO, TIPOS_NOTA_DEBITO } from "@/core/constants/tipos-notas";
import { useWatch } from "react-hook-form";
import { Printer, Save, PanelRightOpen, PanelRightClose, Info } from "lucide-react"; // Novos ícones

import { TechnicalPanel } from "./technical-panel";
import { PrintableConfig } from "./printable-config";

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
    const finalidade = useWatch({ control: form.control, name: "finalidadeNFe" });

    // Estados visuais
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showTechnicalPanel, setShowTechnicalPanel] = useState(false); // <--- Começa fechado

    // Impressão
    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    const handleFocus = (fieldName: string) => () => {
        setFocusedField(fieldName);
        // Opcional: Se quiser abrir o painel automaticamente ao focar, descomente abaixo:
        // setShowTechnicalPanel(true); 
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-500 relative">

            {/* === COLUNA DO FORMULÁRIO (Dinâmica) === */}
            <div className={`transition-all duration-300 ease-in-out ${showTechnicalPanel ? "xl:col-span-8" : "xl:col-span-12"}`}>
                <div className="bg-card text-card-foreground rounded-lg shadow border border-border p-6">

                    {/* Header do Form */}
                    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                        <div>
                            <h2 className="text-xl font-semibold">
                                {initialValues ? "Editar Modelo" : "Novo Modelo"}
                            </h2>
                            <span className="text-xs text-muted-foreground font-mono">
                                ID: {initialValues?.id || "Novo"}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            {/* Botão Toggle do Painel */}
                            <Button
                                variant={showTechnicalPanel ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setShowTechnicalPanel(!showTechnicalPanel)}
                                className="gap-2"
                                title={showTechnicalPanel ? "Ocultar Detalhes" : "Mostrar Detalhes Técnicos"}
                            >
                                {showTechnicalPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                                <span className="hidden sm:inline">Info Técnica</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrint()}
                                className="gap-2 border-dashed"
                            >
                                <Printer size={16} />
                                <span className="hidden sm:inline">Ficha</span>
                            </Button>
                        </div>
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

                                        {/* Grupo de Documento */}
                                        <div className="col-span-12">
                                            <FormField
                                                control={form.control}
                                                name="grupoDocumento"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-base font-semibold text-primary">1. Grupo de Negócio</FormLabel>
                                                        <FormControl>
                                                            <Select
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                                onOpenChange={(isOpen) => isOpen && setFocusedField("grupoDocumento")}
                                                            >
                                                                <SelectTrigger className="h-12 bg-background text-lg" onFocus={handleFocus("grupoDocumento")}>
                                                                    <SelectValue placeholder="Selecione o tipo de operação..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="max-h-[300px]">
                                                                    {GRUPOS_DOCUMENTO.map((grupo, index) => (
                                                                        <SelectItem key={`${grupo.value}-${index}`} value={grupo.value}>
                                                                            <span className="font-mono font-bold mr-2">{grupo.value}</span>
                                                                            - {grupo.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormDescription>Define as regras contábeis principais.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Descrição */}
                                        <div className="col-span-12">
                                            <FormField
                                                control={form.control}
                                                name="descricao"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Descrição do Modelo *</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Ex: Nota Fiscal de Saída Padrão"
                                                                className="bg-background"
                                                                {...field}
                                                                onFocus={handleFocus("descricao")}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Linha Fiscal Básica */}
                                        <div className="col-span-6 md:col-span-2">
                                            <FormField
                                                control={form.control}
                                                name="modelo"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Modelo</FormLabel>
                                                        <FormControl>
                                                            <Input className="text-center font-mono bg-background" maxLength={2} {...field} onFocus={handleFocus("modelo")} />
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
                                                        <FormLabel>Série</FormLabel>
                                                        <FormControl>
                                                            <Input className="text-center font-mono bg-background" maxLength={3} {...field} onFocus={handleFocus("serie")} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="col-span-12 md:col-span-8">
                                            <FormField
                                                control={form.control}
                                                name="movimentaEstoque"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Movimenta Estoque?</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value} onOpenChange={() => setFocusedField("movimentaEstoque")}>
                                                                <SelectTrigger className="bg-background" onFocus={handleFocus("movimentaEstoque")}>
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

                                        {/* Finalidade */}
                                        <div className="col-span-12">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-border rounded-lg bg-muted/20">
                                                <FormField
                                                    control={form.control}
                                                    name="finalidadeNFe"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Finalidade NFe</FormLabel>
                                                            <FormControl>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value} onOpenChange={() => setFocusedField("finalidadeNFe")}>
                                                                    <SelectTrigger className="bg-background" onFocus={handleFocus("finalidadeNFe")}>
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

                                                {finalidade === "5" && (
                                                    <FormField
                                                        control={form.control}
                                                        name="tpNFCredito"
                                                        render={({ field }) => (
                                                            <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                                                                <FormLabel>Motivo (Crédito)</FormLabel>
                                                                <FormControl>
                                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {TIPOS_NOTA_CREDITO.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}

                                                {finalidade === "6" && (
                                                    <FormField
                                                        control={form.control}
                                                        name="tpNFDebito"
                                                        render={({ field }) => (
                                                            <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                                                                <FormLabel>Motivo (Débito)</FormLabel>
                                                                <FormControl>
                                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {TIPOS_NOTA_DEBITO.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
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
                                        <div className="col-span-12">
                                            <div className="bg-muted/50 p-4 border border-border rounded-lg">
                                                <div className="mb-4">
                                                    <h4 className="text-sm font-semibold">CFOPs Sugeridos</h4>
                                                    <p className="text-xs text-muted-foreground">Sugeridos automaticamente, mas alteráveis na emissão.</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopEstadual"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>CFOP Estadual</FormLabel>
                                                                <FormControl>
                                                                    <Input className="font-mono bg-background" {...field} onFocus={handleFocus("cfopEstadual")} />
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
                                                                <FormLabel>CFOP Interestadual</FormLabel>
                                                                <FormControl>
                                                                    <Input className="font-mono bg-background" {...field} onFocus={handleFocus("cfopInterestadual")} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ABA 2: COMPORTAMENTOS */}
                                <TabsContent value="comportamentos" className="mt-6">
                                    <div className="bg-muted/30 border border-border rounded-lg p-4" onClick={() => setFocusedField("comportamentos")}>
                                        <div className="mb-4">
                                            <h3 className="text-sm font-medium">Regras de Negócio</h3>
                                            <p className="text-xs text-muted-foreground">Selecione os comportamentos automáticos.</p>
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
                                                                    render={({ field }) => (
                                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-3 bg-card hover:bg-muted/50 transition-colors">
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    checked={field.value?.includes(item.id)}
                                                                                    onCheckedChange={(checked) => checked
                                                                                        ? field.onChange([...(field.value || []), item.id])
                                                                                        : field.onChange(field.value?.filter((v: string) => v !== item.id))
                                                                                    }
                                                                                />
                                                                            </FormControl>
                                                                            <div className="space-y-1 leading-none cursor-pointer">
                                                                                <FormLabel className="font-bold text-primary cursor-pointer">{item.id}</FormLabel>
                                                                                <FormDescription className="cursor-pointer">{item.label}</FormDescription>
                                                                            </div>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        </ScrollArea>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                    <Save size={16} /> Salvar Configuração
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>

            {/* === COLUNA DO RAIO-X (Condicional e Anulada) === */}
            {showTechnicalPanel && (
                <div className="xl:col-span-4 animate-in fade-in slide-in-from-right-10 duration-300">
                    <TechnicalPanel
                        focusedField={focusedField}
                        onClose={() => setShowTechnicalPanel(false)}
                    />
                </div>
            )}

            {/* Print Hidden */}
            <div style={{ display: "none" }}>
                <PrintableConfig
                    ref={componentRef}
                    data={form.getValues()}
                />
            </div>
        </div>
    );
}