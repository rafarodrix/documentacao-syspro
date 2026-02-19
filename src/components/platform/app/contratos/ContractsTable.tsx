"use client";

import { toast } from "sonner";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Building2,
    CalendarClock,
    MoreHorizontal,
    Pencil,
    FileText,
    Trash2,
    ArrowRightLeft,
    Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- HELPERS ---
const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));

interface ContractsTableProps {
    contracts: any[];
}

export function ContractsTable({ contracts }: ContractsTableProps) {
    return (
        <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl">
            {/* Efeito de Borda Superior Animada (Magic UI Style) */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-b border-border/60">
                            <TableHead className="w-[300px] text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 h-12">Empresa / Parceiro</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Vigência</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Base (Sal. Mín)</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Aliq.</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Líquido (Final)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in zoom-in-95 duration-500">
                                        <div className="p-4 rounded-full bg-muted/30">
                                            <FileText className="h-8 w-8 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-foreground">Nenhum contrato encontrado</p>
                                            <p className="text-xs">Cadastre um novo contrato para começar a gestão.</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            contracts.map((contract, index) => {
                                // Cálculos
                                const gross = contract.minimumWage * (contract.percentage / 100);
                                const taxDed = gross * (contract.taxRate / 100);
                                const progDed = gross * ((contract.programmerRate || 0) / 100);
                                const net = gross - taxDed - progDed;
                                const isActive = contract.status === 'ACTIVE';

                                return (
                                    <TableRow
                                        key={contract.id}
                                        className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                                        style={{ animationDelay: `${index * 50}ms` }} // Staggered animation
                                    >
                                        {/* Empresa */}
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover/row:bg-primary/20 group-hover/row:scale-105">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                                                        {contract.company.razaoSocial}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono tracking-tight">
                                                        CNPJ: {contract.company.cnpj}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Data */}
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                                <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                                                {formatDate(contract.startDate)}
                                            </div>
                                        </TableCell>

                                        {/* Base */}
                                        <TableCell>
                                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                                {formatCurrency(contract.minimumWage)}
                                            </span>
                                        </TableCell>

                                        {/* Percentual */}
                                        <TableCell>
                                            <Badge variant="outline" className="bg-background/50 font-mono text-[10px] font-normal border-border/60">
                                                {contract.percentage}%
                                            </Badge>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors",
                                                isActive
                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                                    : "bg-muted text-muted-foreground border-border"
                                            )}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                                                {isActive ? "Ativo" : "Inativo"}
                                            </div>
                                        </TableCell>

                                        {/* Líquido */}
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className={cn(
                                                    "font-bold font-mono text-sm tracking-tight tabular-nums",
                                                    isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                                )}>
                                                    {formatCurrency(net)}
                                                </span>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                                                    <Wallet className="h-3 w-3" />
                                                    <span>Bruto: {formatCurrency(gross)}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Ações */}
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover/row:opacity-100 transition-opacity data-[state=open]:opacity-100">
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuLabel className="text-xs text-muted-foreground">Gerenciar Contrato</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem onClick={() => toast.info("Em breve: Edição")} className="cursor-pointer gap-2">
                                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                        Editar Termos
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem onClick={() => toast.info("Em breve: Histórico")} className="cursor-pointer gap-2">
                                                        <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                                        Ver Repasses
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer gap-2">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Suspender
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