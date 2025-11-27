"use client";

import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UsersToolbar() {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-1 rounded-lg border border-border/40">
            {/* Área de Busca */}
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    type="search"
                    placeholder="Buscar por nome ou e-mail..."
                    className="pl-9 bg-background border-border/60 focus:ring-primary/20 transition-all h-9"
                // Aqui você conectaria com um estado ou URL search params
                />
            </div>

            {/* Área de Filtros (Placeholder para futuro) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="sm" className="text-muted-foreground h-9 gap-2 w-full sm:w-auto justify-start sm:justify-center">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-xs">Filtros</span>
                </Button>
            </div>
        </div>
    );
}