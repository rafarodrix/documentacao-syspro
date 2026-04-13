'use client';

import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useDocumentoForm } from "@/features/documentos/interface";
import { documentoSchema, type DocumentoFormValues } from "@dosc-syspro/contracts/documento";
import {
  GRUPOS_DOCUMENTO,
  COMPORTAMENTOS_DOCUMENTO,
  TIPOS_NOTA_CREDITO,
  TIPOS_NOTA_DEBITO,
} from "@dosc-syspro/contracts/documento-config";
import { useWatch } from "react-hook-form";
import { Printer, Save, PanelRightOpen, PanelRightClose, Info, Truck, Users, Box } from "lucide-react";

import { TechnicalPanel } from "./TechnicalPanel";
import { PrintableConfig } from "./PrintableConfig";

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
import { Separator } from "@/components/ui/separator";

interface DocumentoFormProps {
    initialValues?: DocumentoFormValues | null;
    onSave: (data: DocumentoFormValues) => void;
    onCancel: () => void;
}

export function DocumentoForm({ initialValues, onSave, onCancel }: DocumentoFormProps) {
    const form = useDocumentoForm(initialValues);
    const finalidade = useWatch({ control: form.control, name: "finalidadeNFe" });

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showTechnicalPanel, setShowTechnicalPanel] = useState(false);

    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef: componentRef });

    const handleFocus = (fieldName: string) => () => setFocusedField(fieldName);
    const printableData = documentoSchema.parse(form.getValues());

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-500 relative">

            <div className={`transition-all duration-300 ease-in-out ${showTechnicalPanel ? "xl:col-span-8" : "xl:col-span-12"}`}>
                <div className="bg-card text-card-foreground rounded-lg shadow border border-border p-6">

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
                            <Button
                                variant={showTechnicalPanel ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setShowTechnicalPanel(!showTechnicalPanel)}
                                className="gap-2"
                            >
                                {showTechnicalPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                                <span className="hidden sm:inline">Info Tecnica</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-2 border-dashed">
                                <Printer size={16} /> <span className="hidden sm:inline">Ficha</span>
                            </Button>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">

                            <Tabs defaultValue="geral" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 lg:w-100">
                                    <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
                                    <TabsTrigger value="comportamentos">Comportamentos</TabsTrigger>
                                </TabsList>

                                <TabsContent value="geral" className="mt-6 space-y-6">
                                    {/* === SECAO 1: IDENTIFICACAO === */}
                                    <div className="grid grid-cols-12 gap-6">
                                        <div className="col-span-12">
                                            <FormField
                                                control={form.control}
                                                name="grupoDocumento"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-base font-semibold text-primary">1. Grupo de Negocio</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value} onOpenChange={(isOpen) => isOpen && setFocusedField("grupoDocumento")}>
                                                                <SelectTrigger className="h-12 bg-background text-lg" onFocus={handleFocus("grupoDocumento")}>
                                                                    <SelectValue placeholder="Selecione..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="max-h-75">
                                                                    {GRUPOS_DOCUMENTO.map((grupo, index) => (
                                                                        <SelectItem key={`${grupo.value}-${index}`} value={grupo.value}>
                                                                            <span className="font-mono font-bold mr-2">{grupo.value}</span> - {grupo.label}
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

                                        <div className="col-span-12">
                                            <FormField
                                                control={form.control}
                                                name="descricao"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Descricao do Modelo *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ex: Venda de Mercadorias" className="bg-background" {...field} onFocus={handleFocus("descricao")} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

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
                                                        <FormLabel>S?rie</FormLabel>
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
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="SAIDA">Sim (Sa?da)</SelectItem>
                                                                    <SelectItem value="ENTRADA">Sim (Entrada)</SelectItem>
                                                                    <SelectItem value="NAO">N?o movimenta</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* === SECAO 2: MATRIZ DE CFOPs (GRID) === */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary mb-1">Matriz de CFOPs Sugeridos</h3>
                                        <p className="text-sm text-muted-foreground mb-4">Defina os codigos fiscais padrao para cada cenario de operacao. O sistema usar? esta matriz para preencher a nota automaticamente.</p>

                                        <div className="border rounded-lg overflow-hidden">
                                            {/* Cabe?alho da Tabela */}
                                            <div className="grid grid-cols-12 bg-muted/50 p-3 border-b text-sm font-bold text-muted-foreground">
                                                <div className="col-span-4 flex items-center gap-2"><Box size={16} /> Cen?rio Fiscal</div>
                                                <div className="col-span-4 flex items-center gap-2 text-center justify-center"><Truck size={16} /> Estadual (Interno)</div>
                                                <div className="col-span-4 flex items-center gap-2 text-center justify-center"><Truck size={16} /> Interestadual (Externo)</div>
                                            </div>

                                            {/* LINHA 1: TRIBUTADO (PADR?O) */}
                                            <div className="grid grid-cols-12 p-4 gap-4 items-center border-b hover:bg-muted/10">
                                                <div className="col-span-12 md:col-span-4">
                                                    <span className="font-medium text-sm">1. Tributacao Normal</span>
                                                    <p className="text-xs text-muted-foreground">Regra geral (Revenda, Ind?stria)</p>
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopEstadual"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 5102" className="text-center font-mono bg-background" onFocus={handleFocus("cfopEstadual")} />
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopInterestadual"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 6102" className="text-center font-mono bg-background" onFocus={handleFocus("cfopInterestadual")} />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* LINHA 2: SUBSTITUICAO TRIBUTARIA */}
                                            <div className="grid grid-cols-12 p-4 gap-4 items-center border-b hover:bg-muted/10">
                                                <div className="col-span-12 md:col-span-4">
                                                    <span className="font-medium text-sm">2. Substituicao Tributaria (ST)</span>
                                                    <p className="text-xs text-muted-foreground">Quando o produto tem retencao (CST 10, 60, 70)</p>
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopEstadualST"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 5405" className="text-center font-mono bg-background" onFocus={handleFocus("cfopEstadualST")} />
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopInterestadualST"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 6403" className="text-center font-mono bg-background" onFocus={handleFocus("cfopInterestadualST")} />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* LINHA 3: CONSUMIDOR FINAL */}
                                            <div className="grid grid-cols-12 p-4 gap-4 items-center border-b hover:bg-muted/10">
                                                <div className="col-span-12 md:col-span-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">3. Consumidor Final</span>
                                                        <Users size={14} className="text-blue-500" />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">Venda para nao contribuintes (PF/PJ)</p>
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopEstadualConsumidor"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 5102" className="text-center font-mono bg-background" onFocus={handleFocus("cfopEstadualConsumidor")} />
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopInterestadualConsumidor"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 6108" className="text-center font-mono bg-background" onFocus={handleFocus("cfopInterestadualConsumidor")} />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* LINHA 4: EXTERIOR */}
                                            <div className="grid grid-cols-12 p-4 gap-4 items-center hover:bg-muted/10">
                                                <div className="col-span-12 md:col-span-4">
                                                    <span className="font-medium text-sm">4. Exterior (Exportacao)</span>
                                                </div>
                                                <div className="col-span-12 md:col-span-8">
                                                    <FormField
                                                        control={form.control}
                                                        name="cfopInternacional"
                                                        render={({ field }) => (
                                                            <Input {...field} placeholder="Ex: 7102" className="text-center font-mono bg-background" onFocus={handleFocus("cfopInternacional")} />
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* === SECAO 3: FINALIDADE NFE === */}
                                    <div className="p-4 border border-border rounded-lg bg-muted/20">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="finalidadeNFe"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Finalidade NFe</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value} onOpenChange={() => setFocusedField("finalidadeNFe")}>
                                                                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="1">1 - NF-e normal</SelectItem>
                                                                    <SelectItem value="2">2 - NF-e complementar</SelectItem>
                                                                    <SelectItem value="3">3 - NF-e de ajuste</SelectItem>
                                                                    <SelectItem value="4">4 - Devolucao</SelectItem>
                                                                    <SelectItem value="5">5 - Nota de Cr?dito (IBS/CBS)</SelectItem>
                                                                    <SelectItem value="6">6 - Nota de D?bito (IBS/CBS)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {finalidade === "5" && (
                                                <FormField
                                                    control={form.control}
                                                    name="tpNFCredito"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Motivo (Cr?dito)</FormLabel>
                                                            <FormControl>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {TIPOS_NOTA_CREDITO.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {finalidade === "6" && (
                                                <FormField
                                                    control={form.control}
                                                    name="tpNFDebito"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Motivo (D?bito)</FormLabel>
                                                            <FormControl>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {TIPOS_NOTA_DEBITO.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ABA 2: COMPORTAMENTOS */}
                                <TabsContent value="comportamentos" className="mt-6">
                                    <div className="bg-muted/30 border border-border rounded-lg p-4" onClick={() => setFocusedField("comportamentos")}>
                                        <div className="mb-4">
                                            <h3 className="text-sm font-medium">Regras de Negocio</h3>
                                            <p className="text-xs text-muted-foreground">Selecione os comportamentos autom?ticos.</p>
                                        </div>
                                        <ScrollArea className="h-100 pr-4">
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
                                    <Save size={16} /> Salvar Configuracao
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>

            {showTechnicalPanel && (
                <div className="xl:col-span-4 animate-in fade-in slide-in-from-right-10 duration-300">
                    <TechnicalPanel
                        focusedField={focusedField}
                        onClose={() => setShowTechnicalPanel(false)}
                    />
                </div>
            )}

            <div style={{ display: "none" }}>
                <PrintableConfig ref={componentRef} data={printableData} />
            </div>
        </div>
    );
}

