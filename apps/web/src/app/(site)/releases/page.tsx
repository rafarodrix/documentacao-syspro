import type { Metadata } from "next";
import Link from "next/link";
import { getReleases } from "@/features/releases/application/queries";
import { groupReleasesByDate, releaseMonthNames } from "@/features/releases/domain";
import { Calendar, Rocket, Bug, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Changelog e Atualizacoes",
  description: "Acompanhe a evolucao do sistema, novas funcionalidades e correcoes.",
};

export const dynamic = "force-dynamic";

export default async function ReleasesIndexPage() {
  const releases = await getReleases();
  const timeline = groupReleasesByDate(releases);

  let isFirstCard = true;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="space-y-4 py-8 text-center">
        <h1 className="bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl lg:text-6xl">
          Novidades
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Fique por dentro da evolucao do sistema. Acompanhe abaixo o historico completo de melhorias e correcoes.
        </p>
      </div>

      <Separator />

      {timeline.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 py-20 text-center">
          <p className="text-muted-foreground">Nenhuma atualizacao publicada ainda.</p>
        </div>
      ) : (
        <div className="space-y-20">
          {timeline.map(({ year, months }) => (
            <section key={year} className="relative">
              <div className="sticky top-17.5 z-10 mb-8 flex items-center gap-4 bg-background/95 py-2 backdrop-blur-sm">
                <span className="border-l-4 border-primary pl-4 text-3xl font-bold tracking-tight text-foreground/80">
                  {year}
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {months.map(({ month, bugs, melhorias }) => {
                  const monthIndex = Number(month) - 1;
                  const href = `/releases/${year}/${month}`;
                  const isLatest = isFirstCard;
                  isFirstCard = false;

                  return (
                    <Link key={month} href={href} className="group block h-full focus:outline-none">
                      <Card className="relative flex h-full flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
                        {isLatest ? (
                          <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        ) : null}

                        <CardContent className="flex h-full flex-col p-6">
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`rounded-lg p-2 ${isLatest ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                <Calendar className="h-5 w-5" />
                              </div>
                              <span className="text-xl font-semibold">{releaseMonthNames[monthIndex]}</span>
                            </div>

                            {isLatest ? (
                              <Badge className="border-0 bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm animate-pulse">
                                <Sparkles className="mr-1 h-3 w-3" /> Novo
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mb-6 mt-auto grid gap-3">
                            <div className="flex items-center justify-between rounded border border-emerald-500/10 bg-emerald-500/5 p-2 text-sm">
                              <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                <Rocket className="h-4 w-4" /> Melhorias
                              </span>
                              <span className="font-mono font-bold">{melhorias}</span>
                            </div>
                            <div className="flex items-center justify-between rounded border border-amber-500/10 bg-amber-500/5 p-2 text-sm">
                              <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <Bug className="h-4 w-4" /> Correcoes
                              </span>
                              <span className="font-mono font-bold">{bugs}</span>
                            </div>
                          </div>

                          <Button variant="ghost" className="w-full justify-between transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            Ver detalhes
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
