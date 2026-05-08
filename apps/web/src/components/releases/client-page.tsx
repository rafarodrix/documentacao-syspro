"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button, Badge } from "@dosc-syspro/ui";
import { ReleasesFilter, type FilterType } from "./releases-filter";
import { MonthlyReleasesClient } from "./monthly-releases-client";
import { releaseMonthNames } from "@/features/releases/domain";
import type { Release } from "@dosc-syspro/core";

interface ReleasesClientPageProps {
  initialReleases: Release[];
  year: string;
  month: string;
}

export function ReleasesClientPage({ initialReleases, year, month }: ReleasesClientPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { filteredBugs, filteredMelhorias, filteredNovasFuncionalidades } = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const filteredBySearch = initialReleases.filter((release) => {
      const matchesText =
        release.title?.toLowerCase().includes(searchLower) ||
        release.summary.toLowerCase().includes(searchLower) ||
        release.id.toString().includes(searchLower);

      const matchesTags = release.tags?.some((tag) => tag.toLowerCase().includes(searchLower));

      return matchesText || matchesTags;
    });

    const bugs = filteredBySearch.filter(
      (release) => release.type.toLowerCase() === "bug" && (activeFilter === "all" || activeFilter === "bug"),
    );

    const novasFuncionalidades = filteredBySearch.filter(
      (release) =>
        release.type.toLowerCase() === "nova funcionalidade" &&
        (activeFilter === "all" || activeFilter === "nova_funcionalidade"),
    );

    const melhorias = filteredBySearch.filter(
      (release) =>
        !["bug", "nova funcionalidade"].includes(release.type.toLowerCase()) &&
        (activeFilter === "all" || activeFilter === "melhoria"),
    );

    return { filteredBugs: bugs, filteredMelhorias: melhorias, filteredNovasFuncionalidades: novasFuncionalidades };
  }, [initialReleases, searchTerm, activeFilter]);

  const monthName = releaseMonthNames[Number(month) - 1] || month;

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5">
        <div className="animate-in slide-in-from-top-4 flex flex-col gap-4 p-6 duration-500 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Link href="/portal/releases">
              <Button variant="ghost" className="mb-2 gap-2 pl-0 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Voltar para o indice
              </Button>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Notas de release
              </h1>
              <Badge variant="outline" className="gap-1.5 rounded-full bg-background px-3 py-1 text-sm font-normal">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {monthName} {year}
              </Badge>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              Consulte melhorias, correcoes e materiais complementares publicados neste ciclo.
            </p>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5">
        <ReleasesFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      {filteredBugs.length === 0 && filteredMelhorias.length === 0 && filteredNovasFuncionalidades.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
          <p className="text-muted-foreground">Nenhum resultado encontrado para sua busca.</p>
          <Button
            variant="link"
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
            }}
            className="mt-2"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <MonthlyReleasesClient melhorias={filteredMelhorias} bugs={filteredBugs} novasFuncionalidades={filteredNovasFuncionalidades} />
      )}
    </div>
  );
}
