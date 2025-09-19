// app/docs/suporte/release/[year]/[month]/page.tsx

import { getReleases } from "@/lib/releases";
import { Heading } from "fumadocs-ui/components/heading";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MonthlyReleasesClient } from "@/components/releases/MonthlyReleasesClient";

// export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const allReleases = await getReleases();

  const uniqueMonths = new Set(
    allReleases.map((release) => {
      if (!release.isoDate) return null;
      const [year, month] = release.isoDate.split("-");
      return `${year}/${month}`;
    })
  );

  return Array.from(uniqueMonths)
    .filter(Boolean) // Remove nulos
    .map((dateStr) => {
      const [year, month] = (dateStr as string).split("/");
      return { year, month };
    });
}

export default async function MonthlyReleasePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  // ✅ Agora espera a Promise antes de acessar
  const { year, month } = await params;

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const monthName = monthNames[Number(month) - 1] || "";

  const allReleases = await getReleases();

  const releasesForMonth = allReleases.filter((release) => {
    if (!release.isoDate) return false;
    const [releaseYear, releaseMonth] = release.isoDate.split("-");
    return releaseYear === year && releaseMonth === month;
  });

  const melhorias = releasesForMonth.filter(
    (r) => r.type.toLowerCase() === "melhoria"
  );
  const bugs = releasesForMonth.filter(
    (r) => r.type.toLowerCase() === "bug"
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <Link
        href="/docs/suporte/releasenotes"
        className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o índice de meses
      </Link>

      <Heading as="h1" className="text-4xl font-bold">
        Atualizações de {monthName} / {year}
      </Heading>

      {releasesForMonth.length > 0 ? (
        <MonthlyReleasesClient melhorias={melhorias} bugs={bugs} />
      ) : (
        <div className="text-center text-muted-foreground py-10">
          <p>Nenhuma atualização encontrada para este mês.</p>
        </div>
      )}
    </div>
  );
}
