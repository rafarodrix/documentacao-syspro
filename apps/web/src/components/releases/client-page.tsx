"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Importe seus componentes refatorados anteriormente
import { ReleasesFilter, type FilterType } from "./ReleasesFilter";
import { MonthlyReleasesClient } from "./MonthlyReleasesClient";
import { monthNames } from "@/core/infrastructure/mappers/zammad-release.mapper";
import type { Release } from "@/core/domain/entities/release.entity";

interface ReleasesClientPageProps {
    initialReleases: Release[];
    year: string;
    month: string;
}

export function ReleasesClientPage({ initialReleases, year, month }: ReleasesClientPageProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");

    // Lógica de Filtragem Otimizada (useMemo)
    const { filteredBugs, filteredMelhorias } = useMemo(() => {
        // 1. Filtrar por Termo de Busca
        const searchLower = searchTerm.toLowerCase();
        const filteredBySearch = initialReleases.filter((release) => {
            const matchesText =
                release.title?.toLowerCase().includes(searchLower) ||
                release.summary.toLowerCase().includes(searchLower) ||
                release.id.toString().includes(searchLower);

            const matchesTags = release.tags?.some(tag => tag.toLowerCase().includes(searchLower));

            return matchesText || matchesTags;
        });

        // 2. Filtrar por Tipo (Tab) e separar
        const bugs = filteredBySearch.filter(
            (r) => r.type.toLowerCase() === "bug" && (activeFilter === "all" || activeFilter === "bug")
        );

        const melhorias = filteredBySearch.filter(
            (r) => r.type.toLowerCase() !== "bug" && (activeFilter === "all" || activeFilter === "melhoria")
        );

        return { filteredBugs: bugs, filteredMelhorias: melhorias };
    }, [initialReleases, searchTerm, activeFilter]);

    const monthName = monthNames[Number(month) - 1] || month;

    return (
        <div className="container max-w-5xl py-10 mx-auto space-y-8">
            {/* Header de Navegação */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in slide-in-from-top-4 duration-500">
                <div className="space-y-1">
                    <Link href="/releases">
                        <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground mb-2">
                            <ArrowLeft className="w-4 h-4" /> Voltar para o Índice
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Notas de Release
                        </h1>
                        <Badge variant="outline" className="text-base px-3 py-1 font-normal gap-1.5 bg-background">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {monthName} {year}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        Confira as últimas melhorias e correções aplicadas no sistema.
                    </p>
                </div>
            </div>

            <Separator />

            {/* Área de Controle (Busca e Filtros) */}
            <ReleasesFilter
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            {/* Lista de Releases (Feedback Visual se vazio) */}
            {(filteredBugs.length === 0 && filteredMelhorias.length === 0) ? (
                <div className="text-center py-20 border border-dashed rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Nenhum resultado encontrado para sua busca.</p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchTerm(""); setActiveFilter("all"); }}
                        className="mt-2"
                    >
                        Limpar filtros
                    </Button>
                </div>
            ) : (
                <MonthlyReleasesClient
                    melhorias={filteredMelhorias}
                    bugs={filteredBugs}
                />
            )}
        </div>
    );
}