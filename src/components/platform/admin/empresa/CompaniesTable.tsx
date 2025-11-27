"use client";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompanySheet } from "@/components/platform/admin/empresa/CompanySheet";
import { Building2, MapPin, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompaniesTableProps {
    companies: any[];
}

export function CompaniesTable({ companies }: CompaniesTableProps) {
    return (
        <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl">
            {/* Linha de brilho no topo */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-b border-border/60">
                            <TableHead className="w-[350px] text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 h-12">Organização</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Documento / Local</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Usuários</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                        <div className="p-4 rounded-full bg-muted/30">
                                            <Building2 className="h-8 w-8 opacity-40" />
                                        </div>
                                        <p className="font-medium text-foreground">Nenhuma empresa encontrada</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            companies.map((company, index) => (
                                <TableRow
                                    key={company.id}
                                    className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Organização com Avatar */}
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-border/60 rounded-lg">
                                                <AvatarImage src="" alt={company.razaoSocial} />
                                                <AvatarFallback className="rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs">
                                                    {company.razaoSocial.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm text-foreground truncate max-w-[250px]">
                                                    {company.razaoSocial}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {company.nomeFantasia || "Sem nome fantasia"}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Info Técnica */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded w-fit border border-border/50">
                                                <FileText className="h-3 w-3 opacity-60" />
                                                {company.cnpj}
                                            </div>
                                            {/* Exibe cidade se existir, senão placeholder */}
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                                                <MapPin className="h-3 w-3 opacity-60" />
                                                {company.cidade && company.estado ? `${company.cidade} - ${company.estado}` : "Local não informado"}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <StatusBadge status={company.status} />
                                    </TableCell>

                                    {/* Usuários */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {/* Simulação visual de usuários */}
                                                {[...Array(Math.min(company._count?.users || 0, 3))].map((_, i) => (
                                                    <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[8px] text-muted-foreground font-bold border">
                                                        <Users className="h-3 w-3" />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {company._count?.users || 0} membros
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Ações */}
                                    <TableCell className="text-right">
                                        <CompanySheet companyToEdit={company} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}

// --- HELPERS VISUAIS ---
function StatusBadge({ status }: { status: string }) {
    const isTop = status === 'ACTIVE';
    const isPending = status === 'PENDING_DOCS';

    let colorClass = "bg-zinc-100 text-zinc-600 border-zinc-200";
    let dotClass = "bg-zinc-400";
    let label = status;

    if (isTop) {
        colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900 dark:text-emerald-400";
        dotClass = "bg-emerald-500 animate-pulse";
        label = "Ativo";
    } else if (isPending) {
        colorClass = "bg-amber-500/10 text-amber-600 border-amber-200";
        dotClass = "bg-amber-500";
        label = "Pendente";
    } else if (status === 'SUSPENDED') {
        colorClass = "bg-rose-500/10 text-rose-600 border-rose-200";
        dotClass = "bg-rose-500";
        label = "Suspenso";
    }

    return (
        <Badge variant="outline" className={cn("font-medium border px-2.5 py-0.5 text-[10px] gap-1.5", colorClass)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
            {label}
        </Badge>
    );
}