"use client"

import { Input } from "@/components/ui/input"
import { Search, ListFilter } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TicketsFiltersProps {
    searchTerm: string
    setSearchTerm: (val: string) => void
    statusFilter: string
    setStatusFilter: (val: string) => void
    isAdmin: boolean
}

export function TicketsFilters({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, isAdmin }: TicketsFiltersProps) {
    return (
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 p-1">

            {/* Abas Estilizadas (Magic UI Style) */}
            <Tabs defaultValue="open" value={statusFilter} onValueChange={setStatusFilter} className="w-full lg:w-auto">
                <TabsList className="grid w-full lg:w-auto grid-cols-3 h-11 p-1 bg-muted/40 border border-border/40 rounded-lg">
                    <TabsTrigger value="open" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Abertos
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Em Análise
                    </TabsTrigger>
                    <TabsTrigger value="closed" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Fechados
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Barra de Busca */}
            <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder={isAdmin ? "Buscar por assunto, ID ou cliente..." : "Buscar por assunto ou ID..."}
                    className="pl-10 bg-background border-border/60 focus:border-primary/50 transition-all h-11 rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
    )
}