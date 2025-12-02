"use client"

import { useState } from "react"
import {
    Plus, Trash2, Calculator, FileDown, HelpCircle,
    ArrowRight, Package, Scale, RefreshCcw, Settings
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    productName: string
    packageWeight: number
    productionQty: number
}

export function ProductionFactorCalculator() {
    const [items, setItems] = useState<RecipeItem[]>([
        { id: "1", productName: "MILHETO MOIDO", packageWeight: 40, productionQty: 450 }
    ])

    // NOVO ESTADO: Rendimento da Receita
    const [recipeYield, setRecipeYield] = useState<number>(25)

    const addItem = () => {
        setItems([
            ...items,
            { id: crypto.randomUUID(), productName: "", packageWeight: 0, productionQty: 0 }
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

    // Cálculo da Baixa Total
    const calculateDraw = (qty: number, factor: number) => qty * factor

    // Cálculo do Fator de Produção (Unitário por Rendimento)
    // Ex: Se gasto 11,25 sacos para fazer 25un, quanto gasto pra fazer 1?
    // Ou: (Qtd / Rendimento) * Fator
    const calculateProductionFactor = (qty: number, factor: number) => {
        if (recipeYield === 0) return 0;
        return (qty / recipeYield) * factor;
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text("Ficha Técnica de Produção", 14, 20)
        doc.setFontSize(10)
        doc.text(`Rendimento Base: ${recipeYield} unidades`, 14, 28)

        const tableData = items.map(item => {
            const factor = calculateFactor(item.packageWeight)
            const prodFactor = calculateProductionFactor(item.productionQty, factor)
            const draw = calculateDraw(item.productionQty, factor)

            return [
                item.productName,
                `${item.packageWeight} kg`,
                factor.toFixed(4),
                `${item.productionQty} kg`,
                prodFactor.toFixed(4), // Novo campo no PDF
                `${draw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} UN`
            ]
        })

        autoTable(doc, {
            startY: 35,
            head: [['Produto', 'Peso Emb.', 'Fator (1/Peso)', 'Qtd. Total', 'Fator Prod.', 'Baixa Total']],
            body: tableData,
            headStyles: { fillColor: [22, 163, 74] },
            styles: { fontSize: 9, cellPadding: 2 },
        })

        doc.save("ficha_tecnica.pdf")
        toast.success("PDF gerado!")
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* CABEÇALHO E RENDIMENTO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Calculadora de Produção</h2>
                    <p className="text-muted-foreground">Defina a composição e fatores de conversão.</p>
                </div>

                {/* INPUT DE RENDIMENTO */}
                <div className="flex items-end gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Rendimento Receita</Label>
                        <div className="relative">
                            <Settings className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="number"
                                className="pl-9 w-32 bg-background border-primary/20 focus:border-primary font-bold text-lg"
                                value={recipeYield}
                                onChange={(e) => setRecipeYield(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={clearAll} title="Limpar">
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleExportPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <FileDown className="w-4 h-4 mr-2" /> PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* TABELA */}
            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-0">
                    <div className="rounded-md overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[30%] pl-4">Insumo</TableHead>
                                    <TableHead className="text-center">Peso Emb. (KG)</TableHead>
                                    <TableHead className="text-center text-blue-600 font-semibold">Fator (Unit)</TableHead>
                                    <TableHead className="text-center">Qtd. Total (KG)</TableHead>

                                    {/* COLUNA NOVA: Fator Produção */}
                                    <TableHead className="text-center bg-amber-50/50 text-amber-700 font-bold border-l border-r border-amber-100">
                                        Fator Prod.
                                    </TableHead>

                                    <TableHead className="text-center text-emerald-600 font-bold bg-emerald-50/30">
                                        Baixa Total (UN)
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
                                        <TableRow key={item.id}>
                                            <TableCell className="pl-4">
                                                <Input
                                                    value={item.productName}
                                                    onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                                                    className="border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-primary transition-all font-medium"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="text-center border-transparent hover:border-input focus:border-primary"
                                                    value={item.packageWeight || ""}
                                                    onChange={(e) => updateItem(item.id, "packageWeight", Number(e.target.value))}
                                                />
                                            </TableCell>

                                            <TableCell className="text-center font-mono text-sm text-blue-600">
                                                {factor > 0 ? factor.toFixed(4) : "-"}
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="text-center border-transparent hover:border-input focus:border-primary font-bold"
                                                    value={item.productionQty || ""}
                                                    onChange={(e) => updateItem(item.id, "productionQty", Number(e.target.value))}
                                                />
                                            </TableCell>

                                            {/* COLUNA NOVA */}
                                            <TableCell className="text-center font-bold text-amber-700 bg-amber-50/30 text-lg border-l border-r border-amber-100">
                                                {prodFactor > 0 ? prodFactor.toFixed(4) : "-"}
                                            </TableCell>

                                            <TableCell className="text-center font-bold text-emerald-700 bg-emerald-50/30 text-lg">
                                                {finalStockDraw > 0 ? finalStockDraw.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "-"}
                                                <span className="text-[10px] font-normal text-muted-foreground ml-1 align-top">UN</span>
                                            </TableCell>

                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-4 border-t bg-muted/10">
                        <Button onClick={addItem} variant="outline" className="w-full border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Composição
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* EXPLICATIVO ATUALIZADO */}
            <Accordion type="single" collapsible className="w-full bg-card border rounded-lg px-4">
                <AccordionItem value="explanation" className="border-none">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <HelpCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Entenda a fórmula de cálculo</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid md:grid-cols-3 gap-4 pt-2 pb-4">

                            <div className="p-4 rounded-lg border bg-muted/30 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                                    <Package className="w-4 h-4" /> Fator Unitário
                                </div>
                                <div className="bg-background p-2 rounded border text-center font-mono text-xs mt-auto">
                                    1 ÷ Peso Embalagem = Fator
                                </div>
                            </div>

                            <div className="p-4 rounded-lg border bg-amber-50/50 border-amber-200 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                                    <Settings className="w-4 h-4" /> Fator Produção
                                </div>
                                <p className="text-xs text-muted-foreground">Proporção para o rendimento definido ({recipeYield}).</p>
                                <div className="bg-background p-2 rounded border text-center font-mono text-xs mt-auto text-amber-700">
                                    (Qtd Total ÷ Rendimento) × Fator
                                </div>
                            </div>

                            <div className="p-4 rounded-lg border bg-emerald-50/50 border-emerald-200 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                                    <Scale className="w-4 h-4" /> Baixa Total (Estoque)
                                </div>
                                <div className="bg-background p-2 rounded border text-center font-mono text-xs mt-auto text-emerald-700">
                                    Qtd Total × Fator = Baixa (UN)
                                </div>
                            </div>

                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}