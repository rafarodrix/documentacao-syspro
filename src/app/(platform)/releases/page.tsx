import type { Metadata } from "next";
import Link from "next/link";
import { getReleases } from "@/core/application/use-cases/get-releases";
import { Calendar, Rocket, Bug, ArrowRight, Sparkles } from "lucide-react";

// Componentes UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Tipos
import type { Release } from "@/core/domain/entities/release";

export const metadata: Metadata = {
    title: "Changelog e Atualizações",
    description: "Acompanhe a evolução do sistema, novas funcionalidades e correções.",
};

// --- Utilitários de Transformação de Dados (Pode extrair para utils se preferir) ---
const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function groupReleases(releases: Release[]) {
    const grouped = releases.reduce((acc, release) => {
        if (!release.isoDate || !release.type) return acc;

        const [year, month] = release.isoDate.split("-");
        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = { bugs: 0, melhorias: 0 };

        const type = release.type.toLowerCase();
        if (type === "bug") acc[year][month].bugs++;
        else if (type === "melhoria" || type === "feature") acc[year][month].melhorias++;

        return acc;
    }, {} as Record<string, Record<string, { bugs: number; melhorias: number }>>);

    // Ordena Anos (Descrescente) e Meses (Decrescente)
    return Object.entries(grouped)
        .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
        .map(([year, monthsData]) => ({
            year,
            months: Object.entries(monthsData)
                .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))
                .map(([month, counts]) => ({ month, ...counts })),
        }));
}

// --- Componente da Página ---
export default async function ReleasesIndexPage() {
    const releases = await getReleases();
    const timeline = groupReleases(releases);

    let isFirstCard = true; // Para destacar o card mais recente

    return (
        <div className="space-y-12 animate-in fade-in duration-700">

            {/* 1. Hero Section */}
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight lg:text-6xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Novidades
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Fique por dentro da evolução do sistema. Acompanhe abaixo o histórico completo de melhorias e correções.
                </p>
            </div>

            <Separator />

            {/* 2. Timeline */}
            {timeline.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                    <p className="text-muted-foreground">Nenhuma atualização publicada ainda.</p>
                </div>
            ) : (
                <div className="space-y-20">
                    {timeline.map(({ year, months }) => (
                        <section key={year} className="relative">

                            {/* Marcador de Ano */}
                            <div className="flex items-center gap-4 mb-8 sticky top-[70px] z-10 py-2 bg-background/95 backdrop-blur-sm">
                                <span className="text-3xl font-bold tracking-tight text-foreground/80 border-l-4 border-primary pl-4">
                                    {year}
                                </span>
                                <div className="h-px flex-1 bg-border/60" />
                            </div>

                            {/* Grid de Meses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {months.map(({ month, bugs, melhorias }) => {
                                    const monthIndex = Number(month) - 1;
                                    const href = `/releases/${year}/${month}`;

                                    const isLatest = isFirstCard;
                                    isFirstCard = false;

                                    return (
                                        <Link key={month} href={href} className="group block h-full focus:outline-none">
                                            <Card className={`
                        h-full flex flex-col overflow-hidden relative transition-all duration-300
                        border-border/60 bg-card
                        group-hover:border-primary/50 group-hover:shadow-lg group-hover:-translate-y-1
                        group-focus-visible:ring-2 group-focus-visible:ring-ring
                      `}>

                                                {/* Efeito Glow para o card mais recente */}
                                                {isLatest && (
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                                )}

                                                <CardContent className="p-6 flex flex-col h-full">

                                                    {/* Cabeçalho do Card */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-2 rounded-lg ${isLatest ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                <Calendar className="w-5 h-5" />
                                                            </div>
                                                            <span className="font-semibold text-xl">{monthNames[monthIndex]}</span>
                                                        </div>

                                                        {isLatest && (
                                                            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 border-0 shadow-sm animate-pulse">
                                                                <Sparkles className="w-3 h-3 mr-1" /> Novo
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Estatísticas */}
                                                    <div className="grid gap-3 mb-6 mt-auto">
                                                        <div className="flex items-center justify-between text-sm p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                                                            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                                                <Rocket className="w-4 h-4" /> Melhorias
                                                            </span>
                                                            <span className="font-mono font-bold">{melhorias}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm p-2 rounded bg-amber-500/5 border border-amber-500/10">
                                                            <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                                                <Bug className="w-4 h-4" /> Correções
                                                            </span>
                                                            <span className="font-mono font-bold">{bugs}</span>
                                                        </div>
                                                    </div>

                                                    {/* Botão de Ação (Fake) */}
                                                    <Button variant="ghost" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                        Ver detalhes
                                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                    </Button>

                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}