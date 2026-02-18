"use client";

import { useState } from "react";
import {
    Search,
    ChevronDown,
    ChevronRight,
    FileText,
    Percent,
    Calendar,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Tipagem simplificada vinda do Prisma (ajuste conforme necessário)
type TaxData = {
    id: string;
    cst: string;
    description: string;
    indIBSCBS: boolean;
    classifications: {
        id: string;
        code: string;
        description: string;
        pRedIBS: any; // Decimal vem como string/number do server component
        pRedCBS: any;
        indNFe: boolean;
        startDate: Date;
        endDate: Date | null;
    }[];
};

interface TaxRulesViewerProps {
    data: TaxData[];
}

export function TaxRulesViewer({ data }: TaxRulesViewerProps) {
    const [searchTerm, setSearchTerm] = useState("");

    // Lógica de Filtro: Busca no CST OU nas Classificações filhas
    const filteredData = data.filter((group) => {
        const searchLower = searchTerm.toLowerCase();

        const matchesCst =
            group.cst.toLowerCase().includes(searchLower) ||
            group.description.toLowerCase().includes(searchLower);

        const matchesChildren = group.classifications.some(c =>
            c.code.includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower)
        );

        return matchesCst || matchesChildren;
    });

    // Helper para formatar Decimal/Number
    const formatPercent = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? "0%" : `${num.toFixed(2)}%`;
    };

    // Helper para Status Visual
    const StatusIcon = ({ active }: { active: boolean }) =>
        active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />;

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* --- BARRA DE BUSCA --- */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por código CST, classificação ou descrição..."
                    className="pl-9 bg-card"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* --- LISTAGEM (ACCORDION) --- */}
            <div className="rounded-md border bg-card">
                <ScrollArea className="h-[600px]">
                    {filteredData.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Nenhum registro fiscal encontrado para "{searchTerm}".
                        </div>
                    ) : (
                        <Accordion type="multiple" className="w-full">
                            {filteredData.map((cst) => (
                                <AccordionItem key={cst.id} value={cst.id} className="border-b last:border-0">
                                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4 text-left w-full">
                                            {/* Badge do CST */}
                                            <Badge variant="outline" className={cn(
                                                "font-mono text-base px-2 py-1 min-w-[60px] justify-center",
                                                cst.indIBSCBS ? "border-primary/50 bg-primary/5 text-primary" : "border-muted bg-muted text-muted-foreground"
                                            )}>
                                                CST {cst.cst}
                                            </Badge>

                                            {/* Descrição do CST */}
                                            <div className="flex-1 flex flex-col">
                                                <span className="font-medium text-sm">{cst.description}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {cst.indIBSCBS && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                                            <Percent className="h-3 w-3" /> Tributável
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <FileText className="h-3 w-3" /> {cst.classifications.length} Classificações
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="bg-muted/10 px-0 pb-0">
                                        {/* --- TABELA DE FILHOS (CLASSIFICAÇÕES) --- */}
                                        <div className="border-t">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead className="w-[100px] pl-6">Cód. Class</TableHead>
                                                        <TableHead>Detalhe da Classificação</TableHead>
                                                        <TableHead className="w-[100px] text-center">NFe</TableHead>
                                                        <TableHead className="w-[120px] text-right">Red. IBS</TableHead>
                                                        <TableHead className="w-[120px] text-right pr-6">Red. CBS</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {cst.classifications.map((cls) => (
                                                        <TableRow key={cls.id} className="hover:bg-background/80">
                                                            <TableCell className="pl-6 font-medium font-mono text-xs">
                                                                {cls.code}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {cls.description}
                                                                <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground/60">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        Vigência: {new Date(cls.startDate).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex justify-center">
                                                                    <StatusIcon active={cls.indNFe} />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs tabular-nums">
                                                                {formatPercent(cls.pRedIBS)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs tabular-nums pr-6">
                                                                {formatPercent(cls.pRedCBS)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}