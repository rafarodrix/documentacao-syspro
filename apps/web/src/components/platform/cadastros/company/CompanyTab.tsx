// src\components\platform\cadastros\company\CompanyTab.tsx
"use client"

import { useState, useMemo } from "react"
import { CompanyStatus } from "@prisma/client"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search, MoreHorizontal, Settings, FileText, Building2, ExternalLink
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

// Modais
import { CreateCompanyDialog } from "./CreateCompanyDialog"
import { EditCompanyDialog } from "./EditCompanyDialog"

// Utilitário simples para máscara de CNPJ (pode ser movido para @/lib/utils)
const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

interface CompanyWithRelations {
    id: string
    cnpj: string
    razaoSocial: string
    nomeFantasia: string | null
    status: CompanyStatus
    usersCount?: number
    _count?: { memberships: number }
    [key: string]: any
}

interface CompanyTabProps {
    data: CompanyWithRelations[]
    isAdmin: boolean
}

export function CompanyTab({ data, isAdmin }: CompanyTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // Estados para o Modal de Edição
    const [companyToEdit, setCompanyToEdit] = useState<CompanyWithRelations | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // Filtragem memoizada para performance
    const filteredData = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase()
        return data.filter(company =>
            company.razaoSocial.toLowerCase().includes(lowerTerm) ||
            (company.nomeFantasia?.toLowerCase().includes(lowerTerm)) ||
            company.cnpj.includes(searchTerm.replace(/\D/g, ""))
        )
    }, [data, searchTerm])

    const handleEditClick = (company: CompanyWithRelations) => {
        setCompanyToEdit(company)
        setIsEditOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* Modais de Gerenciamento */}
            <EditCompanyDialog
                open={isEditOpen}
                onOpenChange={(open) => {
                    setIsEditOpen(open)
                    if (!open) setCompanyToEdit(null)
                }}
                company={companyToEdit}
            />

            {/* Barra de Ações Superior */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por Razão, Fantasia ou CNPJ..."
                        className="pl-10 h-10 bg-background/50 border-border/60 focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {isAdmin && <CreateCompanyDialog />}
            </div>

            {/* Container da Tabela com Shadow Suave */}
            <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                            <TableHead className="py-4 px-6 font-semibold">Organização</TableHead>
                            <TableHead className="font-semibold">CNPJ</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-center font-semibold">Usuários</TableHead>
                            <TableHead className="text-right px-6 font-semibold">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-72 text-center">
                                    <EmptyState isSearching={!!searchTerm} />
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((company) => (
                                <TableRow key={company.id} className="hover:bg-muted/20 transition-colors group">
                                    <TableCell className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground tracking-tight leading-none mb-1.5">
                                                {company.razaoSocial}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Building2 className="h-3 w-3 inline" />
                                                {company.nomeFantasia || "Nome fantasia não informado"}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground border border-border/30">
                                            {formatCNPJ(company.cnpj)}
                                        </code>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge status={company.status} />
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="font-medium bg-background text-muted-foreground border-border/40 hover:bg-muted/50 transition-colors">
                                            {company._count?.memberships ?? company.usersCount ?? 0}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-right px-6">
                                        <CompanyActionsMenu
                                            company={company}
                                            onEdit={() => handleEditClick(company)}
                                        />
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

/** * Componentes Auxiliares para Limpeza de Código
 */

function EmptyState({ isSearching }: { isSearching: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 ring-1 ring-border/50">
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h4 className="text-lg font-semibold text-foreground">
                {isSearching ? "Sem resultados" : "Nenhuma empresa cadastrada"}
            </h4>
            <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                {isSearching
                    ? "Revise os termos da busca ou limpe o filtro."
                    : "Comece adicionando a primeira organização ao sistema."}
            </p>
        </div>
    )
}

function StatusBadge({ status }: { status: CompanyStatus }) {
    const config: Record<CompanyStatus, { label: string; className: string }> = {
        ACTIVE: {
            label: "ATIVO",
            className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        },
        INACTIVE: {
            label: "INATIVO",
            className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
        },
        SUSPENDED: {
            label: "SUSPENSO",
            className: "bg-red-500/10 text-red-600 border-red-500/20"
        },
        // Caso seu Enum mude ou precise tratar estados específicos:
        //@ts-ignore - Caso haja algum status antigo vindo do banco
        PENDING_DOCS: {
            label: "PENDENTE",
            className: "bg-amber-500/10 text-amber-600 border-amber-500/20"
        },
    }

    const { label, className } = config[status] || config.INACTIVE

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
            {label}
        </span>
    )
}

function CompanyActionsMenu({ company, onEdit }: { company: any; onEdit: () => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted border border-transparent hover:border-border/50 rounded-md transition-all">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5">
                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5">
                    Opções
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 focus:bg-primary/5 cursor-pointer" onClick={onEdit}>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Editar Cadastro</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 focus:bg-primary/5 cursor-pointer">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Contratos e Planos</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-primary focus:bg-primary/5 cursor-pointer">
                    <ExternalLink className="h-4 w-4" />
                    <span>Ir para Dashboard</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}