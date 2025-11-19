import { Heading } from "fumadocs-ui/components/heading";
import { Card } from "fumadocs-ui/components/card";
import Link from "next/link";
import { Calendar, Bug, Rocket } from "lucide-react";
import { getReleases } from "@/src/lib/releases";
import type { Release } from "@/src/lib/types";

export async function ReleasesIndexPage() {
  const releases = await getReleases();

  if (!releases || releases.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        <p>Nenhuma atualização encontrada.</p>
      </div>
    );
  }

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const monthsByYear = Object.entries(
    releases.reduce((acc, release) => {
      if (!release.isoDate || !release.type) return acc; // Segurança extra
      
      const [year, month] = release.isoDate.split("-");
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = { bugs: 0, melhorias: 0 };
      if (release.type.toLowerCase() === "bug") {
        acc[year][month].bugs++;
      } else if (release.type.toLowerCase() === "melhoria") {
        acc[year][month].melhorias++;
      }
      
      return acc;
    }, {} as Record<string, Record<string, { bugs: number; melhorias: number }>>)
  )
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, monthsData]) => ({
      year,
      months: Object.entries(monthsData)
        .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))
        .map(([month, counts]) => ({ month, ...counts })),
    }));

  let isFirstCard = true;

  return (
    <div className="space-y-12">
      {monthsByYear.map(({ year, months }) => (
        <section key={year}>
          <Heading as="h2" id={`ano-${year}`} className="text-3xl font-bold mb-6">
            Ano {year}
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map(({ month, bugs, melhorias }) => {
              const monthIndex = Number(month) - 1;
              const href = `/docs/suporte/release/${year}/${month}`;
              const currentCardIsFirst = isFirstCard;
              isFirstCard = false;

              return (
                <Link key={month} href={href} className="no-underline group block h-full">
                  <Card
                    className="h-full"
                    title={
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          {monthNames[monthIndex]}
                        </p>
                        {currentCardIsFirst && (
                          <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                            Mais Recente
                          </span>
                        )}
                      </div>
                    }
                    description={year}
                  >
                    <div className="mt-auto border-t pt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Rocket className="w-4 h-4 text-emerald-500" /> Melhorias</span>
                        <span className="font-medium text-foreground">{melhorias}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Bug className="w-4 h-4 text-amber-500" /> Bugs</span>
                        <span className="font-medium text-foreground">{bugs}</span>
                      </div>
                    </div>
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