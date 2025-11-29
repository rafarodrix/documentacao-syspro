"use client"

import { useState } from "react"
import { CreateCompanyDialog } from "@/components/platform/cadastros/CreateCompanyDialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Building2, Search, Plus, MoreHorizontal, FileText, Settings
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface CompanyTabProps {
    data: any[] // Ideal: Prisma.CompanyGetPayload<...>
    isAdmin: boolean
}

export function CompanyTab({ data, isAdmin }: CompanyTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // Filtro local simples
    const filteredData = data.filter(company =>
        company.razaoSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.cnpj?.includes(searchTerm)
    )

    return (
        <div className="space-y-4">
            {/* --- TOPO: Filtros e Ações --- */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou CNPJ..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative w-full sm:w-72">
                    {/* Input de busca... */}
                </div>

                {/* Apenas Admin cria novas empresas */}
                {isAdmin && (
                    <CreateCompanyDialog />
                )}

                {/* Apenas Admin cria novas empresas */}
                {isAdmin && (
                    <Button className="w-full sm:w-auto gap-2">
                        <Plus className="h-4 w-4" /> Nova Empresa
                    </Button>
                )}
            </div>

            {/* --- TABELA --- */}
            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Empresa</TableHead>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Membros</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Nenhuma empresa encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((company) => (
                                <TableRow key={company.id} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{company.razaoSocial}</span>
                                            <span className="text-xs text-muted-foreground">{company.nomeFantasia || "-"}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="font-mono text-xs">{company.cnpj}</TableCell>

                                    <TableCell>
                                        <StatusBadge status={company.status} />
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-normal">
                                            {company._count?.memberships || 0} usuários
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                                                <DropdownMenuItem className="gap-2">
                                                    <Settings className="h-4 w-4" /> Editar Dados
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
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

// Pequeno helper visual
function StatusBadge({ status }: { status: string }) {
    const styles = {
        ACTIVE: "bg-green-100 text-green-700 border-green-200",
        INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
        SUSPENDED: "bg-red-100 text-red-700 border-red-200",
        PENDING_DOCS: "bg-amber-100 text-amber-700 border-amber-200",
    }
    // @ts-ignore
    const style = styles[status] || styles.INACTIVE

    return (
        <div className={`px-2 py-0.5 rounded text-xs font-medium border w-fit ${style}`}>
            {status === 'PENDING_DOCS' ? 'PENDENTE' : status}
        </div>
    )
}