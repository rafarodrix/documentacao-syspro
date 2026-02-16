"use client";

import { Search, Bug, Rocket, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterType = "all" | "melhoria" | "bug";

interface ReleasesFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function ReleasesFilter({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: ReleasesFilterProps) {

  // Configuração dos filtros para evitar repetição de código
  const filters: { id: FilterType; label: string; icon: React.ElementType }[] = [
    { id: "all", label: "Todos", icon: Layers },
    { id: "melhoria", label: "Melhorias", icon: Rocket },
    { id: "bug", label: "Bugs", icon: Bug },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
      {/* Área de Busca */}
      <div className="relative w-full md:max-w-sm group">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          type="text"
          placeholder="Buscar por ID, título ou tag..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-card transition-all focus-visible:ring-offset-0"
        />
      </div>

      {/* Área de Filtros (Estilo Segmented Control) */}
      <div className="flex items-center p-1 bg-muted/50 border border-border/50 rounded-lg w-full md:w-auto overflow-x-auto">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;

          return (
            <Button
              key={filter.id}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "flex-1 md:flex-none gap-2 text-xs md:text-sm transition-all duration-300",
                isActive
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive && "text-primary")} />
              {filter.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}