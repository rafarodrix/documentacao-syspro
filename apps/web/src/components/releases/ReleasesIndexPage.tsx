import Link from "next/link";
import { Calendar, Bug, Rocket, Sparkles } from "lucide-react";
import { getReleases } from '@/core/application/use-cases/get-releases.use-case';
import { groupReleasesByDate, monthNames } from "@/core/infrastructure/mappers/zammad-release.mapper";

// Shadcn Imports
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export async function ReleasesIndexPage() {
  const releases = await getReleases();
  const monthsByYear = groupReleasesByDate(releases);

  if (!monthsByYear || monthsByYear.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        <Bug className="w-10 h-10 mb-2 opacity-20" />
        <p>Nenhuma atualização encontrada.</p>
      </div>
    );
  }

  let isFirstGlobalCard = true;

  return (
    <div className="space-y-16 py-8">
      {monthsByYear.map(({ year, months }) => (
        <section key={year} className="relative">
          {/* Indicador de Ano Lateral (Estilo Timeline) */}
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-4xl font-bold tracking-tight text-foreground/80">
              {year}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {months.map(({ month, bugs, melhorias }) => {
              const monthIndex = Number(month) - 1;
              const href = `/releases/${year}/${month}`;
              const isLatest = isFirstGlobalCard;
              isFirstGlobalCard = false;

              return (
                <Link key={month} href={href} className="group block h-full outline-none">
                  {/* DICA MAGIC UI: Se estiver usando a lib 'magic-ui', 
                     substitua <Card> por <MagicCard gradientColor="#D9D9D955"> 
                  */}
                  <Card className="h-full flex flex-col transition-all duration-300 border-border/50 bg-background/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 overflow-hidden relative">

                    {/* Efeito de brilho no topo para o card mais recente */}
                    {isLatest && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="w-fit text-muted-foreground border-border/50 font-normal">
                          {year}
                        </Badge>
                        {isLatest && (
                          <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 animate-in fade-in zoom-in duration-500 flex gap-1 items-center">
                            <Sparkles className="w-3 h-3" />
                            Novo
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-xl flex items-center gap-2 group-hover:text-primary transition-colors">
                        <Calendar className="w-5 h-5 text-muted-foreground group-hover:text-primary/80 transition-colors" />
                        {monthNames[monthIndex]}
                      </CardTitle>

                      <CardDescription className="line-clamp-2">
                        Atualizações acumuladas de {monthNames[monthIndex].toLowerCase()}.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="mt-auto pb-4">
                      <Separator className="mb-4 bg-border/40" />
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Rocket className="w-4 h-4" />
                            Melhorias
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                            {melhorias}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                          <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Bug className="w-4 h-4" />
                            Correções
                          </span>
                          <span className="font-bold text-amber-700 dark:text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                            {bugs}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 text-xs text-muted-foreground/60 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para ver detalhes ?
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}