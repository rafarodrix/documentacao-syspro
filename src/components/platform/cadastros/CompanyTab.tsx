"use client"

import { useState } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search, MoreHorizontal, Settings, FileText, Building2
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

// Importamos o Modal de Criação
import { CreateCompanyDialog } from "./CreateCompanyDialog"

interface CompanyTabProps {
    data: any[]
    isAdmin: boolean
}

export function CompanyTab({ data, isAdmin }: CompanyTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredData = data.filter(company =>
        company.razaoSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.cnpj?.includes(searchTerm)
    )

    return (
        <div className="space-y-4">
            {/* --- TOPO: Filtros e Botão de Ação --- */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                {/* Barra de Busca com Ícone */}
                <div className="relative w-full sm:w-72 group">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por nome ou CNPJ..."
                        className="pl-9 bg-background border-border focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Botão de Nova Empresa (Apenas Admin) */}
                {isAdmin && (
                    <CreateCompanyDialog />
                )}
            </div>

            {/* --- TABELA (Com correção de Dark Mode) --- */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[300px]">Empresa</TableHead>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Membros</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            // --- EMPTY STATE MELHORADO ---
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                                            <Building2 className="h-6 w-6 opacity-50" />
                                        </div>
                                        <p className="text-base font-medium text-foreground">Nenhuma empresa encontrada</p>
                                        <p className="text-sm">
                                            {searchTerm ? "Tente buscar por outro termo." : "Cadastre uma nova organização para começar."}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((company) => (
                                <TableRow key={company.id} className="hover:bg-muted/30 transition-colors cursor-default">
                                    {/* Nome e Fantasia */}
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{company.razaoSocial}</span>
                                            <span className="text-xs text-muted-foreground">{company.nomeFantasia || "-"}</span>
                                        </div>
                                    </TableCell>

                                    {/* CNPJ Formatado (Monoespaçado) */}
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {company.cnpj}
                                    </TableCell>

                                    {/* Status Badge */}
                                    <TableCell>
                                        <StatusBadge status={company.status} />
                                    </TableCell>

                                    {/* Contador de Membros */}
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-normal bg-muted text-muted-foreground hover:bg-muted">
                                            {company._count?.memberships || company.usersCount || 0} usuários
                                        </Badge>
                                    </TableCell>

                                    {/* Menu de Ações */}
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                                    <Settings className="h-4 w-4" /> Editar Dados
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                                    <FileText className="h-4 w-4" /> Ver Contratos
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

// Helper Visual para Status (Compatível com Dark Mode)
function StatusBadge({ status }: { status: string }) {
    // Mapeamento de cores usando classes do Tailwind que funcionam bem no Dark/Light
    const styles: Record<string, string> = {
        ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        INACTIVE: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/20",
        SUSPENDED: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
        PENDING_DOCS: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
    }

    const style = styles[status] || styles.INACTIVE
    const label = status === 'PENDING_DOCS' ? 'PENDENTE' : status === 'ACTIVE' ? 'ATIVO' : status

    return (
        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border w-fit flex items-center justify-center ${style}`}>
            {label}
        </div>
    )
}