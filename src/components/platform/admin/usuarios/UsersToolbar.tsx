"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal } from "lucide-react";

export function UsersToolbar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [isPending, startTransition] = useTransition();

    // --- LÓGICA DE PESQUISA ---
    function handleSearch(term: string) {
        const params = new URLSearchParams(searchParams);

        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }
        params.set("page", "1"); // Reseta paginação

        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }

    // --- LÓGICA DE FILTRO (Role) ---
    function handleFilterRole(role: string) {
        const params = new URLSearchParams(searchParams);
        const currentRole = params.get("role");

        if (currentRole === role) {
            params.delete("role"); // Remove se já estiver selecionado (toggle)
        } else {
            params.set("role", role);
        }

        params.set("page", "1");

        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }

    const currentRole = searchParams.get("role");

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-1 rounded-lg border border-border/40">
            {/* Área de Busca */}
            <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors" />
                <Input
                    type="search"
                    placeholder="Buscar por nome ou e-mail..."
                    className="pl-9 bg-background border-border/60 focus:ring-primary/20 transition-all h-9"
                    onChange={(e) => {
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
                            className={`h-9 gap-2 w-full sm:w-auto justify-start sm:justify-center transition-colors ${currentRole ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span className="text-xs">
                                {currentRole ? "Filtro Ativo" : "Filtros"}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Filtrar por Função</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuCheckboxItem
                            checked={currentRole === "ADMIN"}
                            onCheckedChange={() => handleFilterRole("ADMIN")}
                        >
                            Administrador
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={currentRole === "DEVELOPER"}
                            onCheckedChange={() => handleFilterRole("DEVELOPER")}
                        >
                            Desenvolvedor
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={currentRole === "CLIENTE_USER"}
                            onCheckedChange={() => handleFilterRole("CLIENTE_USER")}
                        >
                            Cliente (Usuário)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={currentRole === "CLIENTE_ADMIN"}
                            onCheckedChange={() => handleFilterRole("CLIENTE_ADMIN")}
                        >
                            Cliente (Admin)
                        </DropdownMenuCheckboxItem>

                        {currentRole && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="justify-center text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                                    onSelect={() => {
                                        const params = new URLSearchParams(searchParams);
                                        params.delete("role");
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