import type { Metadata } from "next";
import Link from "next/link";
import { getReleases } from "@/features/releases/application/release-read.queries";
import { groupReleasesByDate, releaseMonthNames } from "@/features/releases/domain";
import { Calendar, Rocket, Bug, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@dosc-syspro/ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Changelog e Atualizacoes",
  description: "Acompanhe a evolucao do sistema, novas funcionalidades e correcoes.",
};

export const dynamic = "force-dynamic";

export default async function ReleasesIndexPage() {
  const releases = await getReleases();
  const timeline = groupReleasesByDate(releases);
  const totalMelhorias = releases.filter((release) => release.type.toLowerCase() === "melhoria").length;
  const totalNovasFuncionalidades = releases.filter((release) => release.type.toLowerCase() === "nova funcionalidade").length;
  const totalCorrecoes = releases.filter((release) => release.type.toLowerCase() === "bug").length;

  let isFirstCard = true;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
              Portal Trilink
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Releases do sistema
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Acompanhe o historico de entregas, correcoes e melhorias com o mesmo contexto visual do portal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:min-w-96 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Rocket className="h-4 w-4" />
                Melhorias
              </div>
              <div className="text-2xl font-semibold">{totalMelhorias}</div>
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sky-700 dark:text-sky-400">
                <Sparkles className="h-4 w-4" />
                Novas Funcionalidades
              </div>
              <div className="text-2xl font-semibold">{totalNovasFuncionalidades}</div>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Bug className="h-4 w-4" />
                Correcoes
              </div>
              <div className="text-2xl font-semibold">{totalCorrecoes}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Linha do tempo</h2>
        <p className="text-sm text-muted-foreground">
          Consulte os meses publicados e entre no detalhe de cada pacote liberado.
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
              <div className="sticky top-14 z-10 mb-8 flex items-center gap-4 bg-background/95 py-3 backdrop-blur-sm">
                <span className="border-l-4 border-primary pl-4 text-3xl font-bold tracking-tight text-foreground/80">
                  {year}
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {months.map(({ month, bugs, melhorias, novasFuncionalidades }) => {
                  const monthIndex = Number(month) - 1;
                  const href = `/portal/releases/${year}/${month}`;
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
                              <div className="flex items-center justify-between rounded border border-sky-500/10 bg-sky-500/5 p-2 text-sm">
                                <span className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
                                  <Sparkles className="h-4 w-4" /> Novas Funcionalidades
                                </span>
                                <span className="font-mono font-bold">{novasFuncionalidades}</span>
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
