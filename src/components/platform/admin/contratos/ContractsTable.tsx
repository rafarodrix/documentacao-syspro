"use client";
import { toast } from "sonner";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Building2, CalendarClock, MoreHorizontal, Pencil, FileText, Trash2 } from "lucide-react";

// Formatters
const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

interface ContractsTableProps {
    contracts: any[];
}

export function ContractsTable({ contracts }: ContractsTableProps) {
    return (
        <Card className="border-border/50 shadow-md bg-background overflow-hidden">
            <div className="p-1 bg-muted/30 border-b"></div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[300px]">Empresa / Parceiro</TableHead>
                            <TableHead>Vigência</TableHead>
                            <TableHead>Base (Sal. Mín)</TableHead>
                            <TableHead>Aliq.</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Líquido (Final)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText className="h-8 w-8 opacity-20" />
                                        Nenhum contrato encontrado.
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            contracts.map((contract) => {
                                // Cálculos na Tabela
                                const gross = contract.minimumWage * (contract.percentage / 100);
                                const taxDed = gross * (contract.taxRate / 100);
                                const progDed = gross * ((contract.programmerRate || 0) / 100);
                                const net = gross - taxDed - progDed;
                                const isActive = contract.status === 'ACTIVE';

                                return (
                                    <TableRow key={contract.id} className="group hover:bg-muted/30 transition-colors">
                                        {/* Empresa */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/5 text-primary border border-primary/10">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{contract.company.razaoSocial}</span>
                                                    <span className="text-[11px] text-muted-foreground font-mono">
                                                        CNPJ: {contract.company.cnpj}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Data */}
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <CalendarClock className="h-3 w-3" />
                                                {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                                            </div>
                                        </TableCell>

                                        {/* Base */}
                                        <TableCell>
                                            <span className="font-mono text-sm">{formatCurrency(contract.minimumWage)}</span>
                                        </TableCell>

                                        {/* Percentual */}
                                        <TableCell>
                                            <Badge variant="outline" className="bg-background font-mono">{contract.percentage}%</Badge>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <Badge variant="secondary" className={isActive ? "bg-emerald-500/15 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                                                {isActive ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>

                                        {/* Líquido */}
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-bold font-mono ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                                                    {formatCurrency(net)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">Bruto: {formatCurrency(gross)}</span>
                                            </div>
                                        </TableCell>

                                        {/* Ações */}
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>

                                                    {/* O erro estava aqui, agora resolvido pelo import */}
                                                    <DropdownMenuItem onClick={() => toast.info("Implementar edição individual")}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar Contrato
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Suspender
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}