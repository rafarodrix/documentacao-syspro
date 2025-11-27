"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTransition } from "react";

export function CompaniesToolbar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [isPending, startTransition] = useTransition();

    // --- LÓGICA DE PESQUISA (Debounced) ---
    function handleSearch(term: string) {
        const params = new URLSearchParams(searchParams);

        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }

        // Reseta para a página 1 ao pesquisar
        params.set("page", "1");

        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }

    // --- LÓGICA DE FILTRO (Status) ---
    function handleFilterStatus(status: string) {
        const params = new URLSearchParams(searchParams);

        const currentStatus = params.get("status");

        if (currentStatus === status) {
            params.delete("status"); // Remove se já estiver selecionado (toggle)
        } else {
            params.set("status", status);
        }

        params.set("page", "1"); // Reseta paginação

        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }

    // Verifica qual status está ativo na URL para marcar no checkbox
    const currentStatus = searchParams.get("status");

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-1 rounded-lg border border-border/40">
            {/* Área de Busca */}
            <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors" />
                <Input
                    type="search"
                    placeholder="Buscar por nome ou CNPJ..."
                    className="pl-9 bg-background border-border/60 focus:ring-primary/20 transition-all h-9"
                    onChange={(e) => {
                        // Pequeno delay manual (debounce simples) ou uso direto
                        // Para produção robusta, use use-debounce library
                        setTimeout(() => handleSearch(e.target.value), 300);
                    }}
                    defaultValue={searchParams.get("q")?.toString()}
                />
                {isPending && (
                    <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
            </div>

            {/* Área de Filtros */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-9 gap-2 w-full sm:w-auto justify-start sm:justify-center transition-colors ${currentStatus ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span className="text-xs">
                                {currentStatus ? "Filtro Ativo" : "Filtros"}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={currentStatus === "ACTIVE"}
                            onCheckedChange={() => handleFilterStatus("ACTIVE")}
                        >
                            Ativos
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={currentStatus === "INACTIVE"}
                            onCheckedChange={() => handleFilterStatus("INACTIVE")}
                        >
                            Inativos
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={currentStatus === "PENDING_DOCS"}
                            onCheckedChange={() => handleFilterStatus("PENDING_DOCS")}
                        >
                            Pendentes
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={currentStatus === "SUSPENDED"}
                            onCheckedChange={() => handleFilterStatus("SUSPENDED")}
                        >
                            Suspensos
                        </DropdownMenuCheckboxItem>

                        {/* Botão para limpar filtros se houver algum selecionado */}
                        {currentStatus && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="justify-center text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                                    onSelect={() => {
                                        const params = new URLSearchParams(searchParams);
                                        params.delete("status");
                                        replace(`${pathname}?${params.toString()}`);
                                    }}
                                >
                                    Limpar Filtros
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// Helper para o DropdownMenuItem customizado
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";