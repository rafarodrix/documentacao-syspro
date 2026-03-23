"use client";

import { useState } from "react";
import type { TaxRulesGroupItem } from "@/features/tax/domain/model";
import {
    Search,
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

interface TaxRulesViewerProps {
    data: TaxRulesGroupItem[];
}

export function TaxRulesViewer({ data }: TaxRulesViewerProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredData = data.filter((group) => {
        const searchLower = searchTerm.toLowerCase();

        const matchesCst =
            group.cst.toLowerCase().includes(searchLower) ||
            group.description.toLowerCase().includes(searchLower);

        const matchesChildren = group.classifications.some((c) =>
            c.code.includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower)
        );

        return matchesCst || matchesChildren;
    });

    const formatPercent = (val: unknown) => {
        const num = Number(val);
        return Number.isNaN(num) ? "0%" : `${num.toFixed(2)}%`;
    };

    const StatusIcon = ({ active }: { active: boolean }) =>
        active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />;

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por codigo CST, classificação ou descrição..."
                    className="bg-card pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-md border bg-card">
                <ScrollArea className="h-[600px]">
                    {filteredData.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Nenhum registro fiscal encontrado para &quot;{searchTerm}&quot;.
                        </div>
                    ) : (
                        <Accordion type="multiple" className="w-full">
                            {filteredData.map((cst) => (
                                <AccordionItem key={cst.id} value={cst.id} className="border-b last:border-0">
                                    <AccordionTrigger className="px-4 transition-colors hover:bg-muted/50 hover:no-underline">
                                        <div className="flex w-full items-center gap-4 text-left">
                                            <Badge variant="outline" className={cn(
                                                "min-w-[60px] justify-center px-2 py-1 font-mono text-base",
                                                cst.indIBSCBS ? "border-primary/50 bg-primary/5 text-primary" : "border-muted bg-muted text-muted-foreground"
                                            )}>
                                                CST {cst.cst}
                                            </Badge>

                                            <div className="flex flex-1 flex-col">
                                                <span className="text-sm font-medium">{cst.description}</span>
                                                <div className="mt-1 flex items-center gap-2">
                                                    {cst.indIBSCBS && (
                                                        <span className="flex w-fit items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                                                            <Percent className="h-3 w-3" /> Tributável
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <FileText className="h-3 w-3" /> {cst.classifications.length} Classificações
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="bg-muted/10 px-0 pb-0">
                                        <div className="border-t">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead className="w-[100px] pl-6">Cod. Class</TableHead>
                                                        <TableHead>Detalhe da Classificação</TableHead>
                                                        <TableHead className="w-[100px] text-center">NFe</TableHead>
                                                        <TableHead className="w-[120px] text-right">Red. IBS</TableHead>
                                                        <TableHead className="w-[120px] pr-6 text-right">Red. CBS</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {cst.classifications.map((cls) => (
                                                        <TableRow key={cls.id} className="hover:bg-background/80">
                                                            <TableCell className="pl-6 font-mono text-xs font-medium">
                                                                {cls.code}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {cls.description}
                                                                <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground/60">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        Vigência: {new Date(cls.startDate).toLocaleDateString("pt-BR")}
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
                                                            <TableCell className="pr-6 text-right font-mono text-xs tabular-nums">
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