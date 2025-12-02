"use client"

import { useState } from "react"
import {
    Plus, Trash2, Calculator, FileDown, HelpCircle,
    ArrowRight, Package, Scale, RefreshCcw
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
import { toast } from "sonner"

// Importações para PDF
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Tipo para o item da receita
interface RecipeItem {
    id: string
    productName: string
    packageWeight: number // Peso da embalagem (ex: 40kg)
    productionQty: number // Quanto vai usar na receita (ex: 450kg)
}

export function ProductionFactorCalculator() {
    const [items, setItems] = useState<RecipeItem[]>([
        { id: "1", productName: "MILHETO MOIDO", packageWeight: 40, productionQty: 450 }
    ])

    // --- AÇÕES DE GERENCIAMENTO ---

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
        if (confirm("Deseja limpar toda a lista?")) {
            setItems([])
        }
    }

    const updateItem = (id: string, field: keyof RecipeItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value }
            }
            return item
        }))
    }

    // --- CÁLCULOS AUXILIARES ---
    const calculateFactor = (weight: number) => weight > 0 ? (1 / weight) : 0
    const calculateDraw = (qty: number, factor: number) => qty * factor

    // --- EXPORTAÇÃO PDF ---
    const handleExportPDF = () => {
        const doc = new jsPDF()

        // Título
        doc.setFontSize(18)
        doc.text("Relatório de Fatores de Produção", 14, 20)

        doc.setFontSize(10)
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 28)

        // Preparar dados para a tabela
        const tableData = items.map(item => {
            const factor = calculateFactor(item.packageWeight)
            const draw = calculateDraw(item.productionQty, factor)

            return [
                item.productName || "Sem nome",
                `${item.packageWeight} kg`,
                factor.toFixed(4),
                `${item.productionQty} kg`,
                `${draw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} UN`
            ]
        })

        // Gerar Tabela
        autoTable(doc, {
            startY: 35,
            head: [['Produto / Matéria Prima', 'Peso Emb.', 'Fator (1/Peso)', 'Qtd. Receita', 'Baixa Estoque']],
            body: tableData,
            headStyles: { fillColor: [22, 163, 74] }, // Cor verde (Emerald 600)
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [240, 253, 244] } // Verde bem claro
        })

        // Rodapé com explicação
        const finalY = (doc as any).lastAutoTable.finalY || 40
        doc.setFontSize(8)
        doc.text("Fórmula: Fator = 1 / Peso Embalagem. Baixa = Qtd Receita * Fator.", 14, finalY + 10)

        doc.save("fator_producao.pdf")
        toast.success("PDF gerado com sucesso!")
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* --- CABEÇALHO E AÇÕES --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Calculadora de Produção</h2>
                    <p className="text-muted-foreground">Defina composições e converta KG para Unidades de estoque.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={clearAll} disabled={items.length === 0}>
                        <RefreshCcw className="w-4 h-4 mr-2" /> Limpar
                    </Button>
                    <Button onClick={handleExportPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={items.length === 0}>
                        <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                </div>
            </div>

            {/* --- ÁREA DA TABELA (CARD PRINCIPAL) --- */}
            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-0">
                    <div className="rounded-md overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[35%] pl-4">Produto (Matéria Prima)</TableHead>
                                    <TableHead className="text-center">Peso Embalagem (KG)</TableHead>
                                    <TableHead className="text-center text-blue-600 font-semibold">Fator (Un -&gt; Kg)</TableHead>
                                    <TableHead className="text-center">Qtd. Receita (KG)</TableHead>
                                    <TableHead className="text-center text-emerald-600 font-bold bg-emerald-500/5">Baixa Estoque (UN)</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Nenhuma composição adicionada. Clique em "Adicionar Item".
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => {
                                        const factor = calculateFactor(item.packageWeight);
                                        const finalStockDraw = calculateDraw(item.productionQty, factor);

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="pl-4">
                                                    <Input
                                                        placeholder="Nome do insumo"
                                                        value={item.productName}
                                                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                                                        className="border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-primary transition-all"
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex justify-center">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-24 text-center border-border/50 focus:border-primary"
                                                            value={item.packageWeight || ""}
                                                            onChange={(e) => updateItem(item.id, "packageWeight", Number(e.target.value))}
                                                        />
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center font-mono text-sm text-blue-600 bg-blue-50/30 dark:bg-blue-900/10">
                                                    {factor > 0 ? factor.toFixed(4) : "-"}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex justify-center">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-24 text-center border-border/50 focus:border-primary"
                                                            value={item.productionQty || ""}
                                                            onChange={(e) => updateItem(item.id, "productionQty", Number(e.target.value))}
                                                        />
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center font-bold text-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/20 text-lg">
                                                    {finalStockDraw > 0 ? finalStockDraw.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "-"}
                                                    <span className="text-[10px] font-normal text-muted-foreground ml-1 align-top">UN</span>
                                                </TableCell>

                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Botão de Adicionar na parte inferior da tabela */}
                    <div className="p-4 border-t bg-muted/10">
                        <Button onClick={addItem} variant="outline" className="w-full border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Composição
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* --- ÁREA EXPLICATIVA (Passo a Passo) --- */}
            <Accordion type="single" collapsible className="w-full bg-card border rounded-lg px-4">
                <AccordionItem value="explanation" className="border-none">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <HelpCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Entenda o cálculo passo a passo</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid md:grid-cols-3 gap-4 pt-2 pb-4">

                            {/* Passo 1 */}
                            <div className="p-4 rounded-lg border bg-muted/30 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                                    <Package className="w-4 h-4" /> Passo 1: Fator Unitário
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Primeiro, descobrimos quanto vale <strong>1 KG</strong> em relação à embalagem que temos no estoque.
                                </p>
                                <div className="bg-background p-2 rounded border text-center font-mono text-xs mt-auto">
                                    1 ÷ Peso Embalagem = Fator
                                </div>
                            </div>

                            {/* Ícone Seta */}
                            <div className="hidden md:flex items-center justify-center text-muted-foreground">
                                <ArrowRight className="w-6 h-6 opacity-20" />
                            </div>

                            {/* Passo 2 */}
                            <div className="p-4 rounded-lg border bg-muted/30 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                                    <Scale className="w-4 h-4" /> Passo 2: Baixa de Estoque
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Multiplicamos a quantidade necessária na receita pelo fator encontrado para saber quantos sacos baixar.
                                </p>
                                <div className="bg-background p-2 rounded border text-center font-mono text-xs mt-auto">
                                    Qtd. Receita × Fator = Baixa (UN)
                                </div>
                            </div>

                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}