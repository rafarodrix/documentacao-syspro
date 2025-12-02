"use client"

import { useState } from "react"
import {
    Plus, Trash2, FileDown, HelpCircle,
    ArrowRight, Package, Scale, RefreshCcw, Settings, Box
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface RecipeItem {
    id: string
    code: string        // Novo Campo: Código do Insumo
    productName: string
    packageWeight: number
    productionQty: number
}

export function ProductionFactorCalculator() {
    // Estado do Produto Principal
    const [mainProductCode, setMainProductCode] = useState("")
    const [mainProductDesc, setMainProductDesc] = useState("")
    const [recipeYield, setRecipeYield] = useState<number>(25)

    const [items, setItems] = useState<RecipeItem[]>([
        { id: "1", code: "5115", productName: "MILHETO MOIDO", packageWeight: 40, productionQty: 450 }
    ])

    const addItem = () => {
        setItems([
            ...items,
            { id: crypto.randomUUID(), code: "", productName: "", packageWeight: 0, productionQty: 0 }
        ])
    }

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const clearAll = () => {
        if (confirm("Deseja limpar toda a lista?")) setItems([])
    }

    const updateItem = (id: string, field: keyof RecipeItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === id) return { ...item, [field]: value }
            return item
        }))
    }

    const calculateFactor = (weight: number) => weight > 0 ? (1 / weight) : 0
    const calculateDraw = (qty: number, factor: number) => qty * factor

    // Cálculo do Fator de Produção Unitário
    const calculateProductionFactor = (qty: number, factor: number) => {
        if (recipeYield === 0) return 0;
        return (qty / recipeYield) * factor;
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text("Ficha Técnica de Produção", 14, 20)

        // Cabeçalho do Produto Principal
        doc.setFontSize(12)
        doc.text(`Produto: ${mainProductCode} - ${mainProductDesc}`, 14, 30)
        doc.text(`Rendimento Base: ${recipeYield} unidades`, 14, 36)

        const tableData = items.map(item => {
            const factor = calculateFactor(item.packageWeight)
            const prodFactor = calculateProductionFactor(item.productionQty, factor)
            const draw = calculateDraw(item.productionQty, factor)

            return [
                item.code,
                item.productName,
                `${item.packageWeight} kg`,
                factor.toFixed(4),
                `${item.productionQty} kg`,
                prodFactor.toFixed(4),
                `${draw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} UN`
            ]
        })

        autoTable(doc, {
            startY: 45,
            head: [['Cód.', 'Insumo', 'Peso Emb.', 'Fator', 'Qtd. Total', 'Fator Prod.', 'Baixa Total']],
            body: tableData,
            headStyles: { fillColor: [40, 40, 40] }, // Cinza escuro profissional
            styles: { fontSize: 9, cellPadding: 2 },
        })

        doc.save(`ficha_${mainProductCode || 'tecnica'}.pdf`)
        toast.success("PDF gerado!")
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* --- CABEÇALHO DO PRODUTO PRINCIPAL --- */}
            <div className="bg-card p-5 rounded-xl border shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" /> Dados da Receita
                        </h2>
                        <p className="text-sm text-muted-foreground">Identificação do produto acabado e rendimento.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearAll} title="Limpar">
                            <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Limpar
                        </Button>
                        <Button size="sm" onClick={handleExportPDF} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Código</Label>
                        <Input
                            placeholder="Ex: 1001"
                            value={mainProductCode}
                            onChange={(e) => setMainProductCode(e.target.value)}
                            className="h-9 bg-muted/30 focus:bg-background"
                        />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">Descrição do Produto</Label>
                        <Input
                            placeholder="Ex: Ração Bovina Engorda"
                            value={mainProductDesc}
                            onChange={(e) => setMainProductDesc(e.target.value)}
                            className="h-9 bg-muted/30 focus:bg-background"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-primary">Rendimento (Un)</Label>
                        <div className="relative">
                            <Settings className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="number"
                                className="pl-9 font-bold text-lg h-9 border-primary/30 focus:border-primary bg-primary/5"
                                value={recipeYield}
                                onChange={(e) => setRecipeYield(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TABELA DE COMPOSIÇÃO --- */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[80px] pl-4">Cód.</TableHead>
                                    <TableHead className="min-w-[200px]">Insumo</TableHead>
                                    <TableHead className="text-center w-[100px]">Peso Emb.</TableHead>
                                    <TableHead className="text-center w-[100px] text-muted-foreground">Fator (1/P)</TableHead>
                                    <TableHead className="text-center w-[100px]">Qtd. (KG)</TableHead>

                                    {/* Cores mais sutis e profissionais */}
                                    <TableHead className="text-center w-[100px] bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-semibold border-l border-r border-border/30">
                                        Fator Prod.
                                    </TableHead>

                                    <TableHead className="text-center w-[100px] bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold">
                                        Baixa (UN)
                                    </TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const factor = calculateFactor(item.packageWeight);
                                    const prodFactor = calculateProductionFactor(item.productionQty, factor);
                                    const finalStockDraw = calculateDraw(item.productionQty, factor);

                                    return (
                                        <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                                            <TableCell className="pl-4 py-2">
                                                <Input
                                                    placeholder="000"
                                                    value={item.code}
                                                    onChange={(e) => updateItem(item.id, "code", e.target.value)}
                                                    className="h-8 border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-primary text-xs font-mono"
                                                />
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Input
                                                    placeholder="Descrição do insumo"
                                                    value={item.productName}
                                                    onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                                                    className="h-8 border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-primary"
                                                />
                                            </TableCell>

                                            <TableCell className="py-2">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-center border-transparent hover:bg-background hover:border-input focus:bg-background focus:border-primary"
                                                    value={item.packageWeight || ""}
                                                    onChange={(e) => updateItem(item.id, "packageWeight", Number(e.target.value))}
                                                />
                                            </TableCell>

                                            <TableCell className="text-center font-mono text-xs text-muted-foreground py-2">
                                                {factor > 0 ? factor.toFixed(4) : "-"}
                                            </TableCell>

                                            <TableCell className="py-2">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-center font-medium border-transparent hover:bg-background hover:border-input focus:bg-background focus:border-primary"
                                                    value={item.productionQty || ""}
                                                    onChange={(e) => updateItem(item.id, "productionQty", Number(e.target.value))}
                                                />
                                            </TableCell>

                                            {/* Coluna Fator Prod (Sutil) */}
                                            <TableCell className="text-center py-2 font-mono text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-950/10 border-l border-r border-border/30">
                                                {prodFactor > 0 ? prodFactor.toFixed(4) : "-"}
                                            </TableCell>

                                            {/* Coluna Baixa (Sutil) */}
                                            <TableCell className="text-center py-2 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                                                {finalStockDraw > 0 ? finalStockDraw.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "-"}
                                            </TableCell>

                                            <TableCell className="py-2 text-right pr-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(item.id)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-3 border-t bg-muted/10">
                        <Button onClick={addItem} variant="outline" size="sm" className="w-full border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5 h-9 text-xs uppercase tracking-wide">
                            <Plus className="w-3.5 h-3.5 mr-2" /> Adicionar Composição
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* --- ÁREA EXPLICATIVA --- */}
            <Accordion type="single" collapsible className="w-full bg-card border rounded-lg px-4 shadow-sm">
                <AccordionItem value="explanation" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <HelpCircle className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Entenda a fórmula</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid md:grid-cols-3 gap-4 pt-1 pb-4 text-sm">

                            <div className="p-3 rounded-md border bg-muted/20 flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-medium text-foreground">
                                    <Box className="w-4 h-4 text-primary" /> 1. Fator Unitário
                                </div>
                                <div className="text-xs text-muted-foreground font-mono mt-1 bg-background p-1.5 rounded border">
                                    1 ÷ Peso Embalagem = Fator
                                </div>
                            </div>

                            <div className="p-3 rounded-md border bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/50 flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-medium text-orange-700 dark:text-orange-400">
                                    <Settings className="w-4 h-4" /> 2. Fator Produção
                                </div>
                                <div className="text-xs text-orange-800/80 dark:text-orange-300/80 font-mono mt-1 bg-background/50 p-1.5 rounded border border-orange-200/30">
                                    (Qtd Total ÷ Rendimento) × Fator
                                </div>
                            </div>

                            <div className="p-3 rounded-md border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                                    <Scale className="w-4 h-4" /> 3. Baixa Total
                                </div>
                                <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80 font-mono mt-1 bg-background/50 p-1.5 rounded border border-emerald-200/30">
                                    Qtd Total × Fator = UN
                                </div>
                            </div>

                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}