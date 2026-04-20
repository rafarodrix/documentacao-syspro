import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReleases } from "@/features/releases/application/queries";
import { ReleasesClientPage } from "@/components/releases/ClientPage";
import { releaseMonthNames } from "@/features/releases/domain";

export const dynamic = "force-dynamic";

// 1. GeraÃ§Ã£o de Metadata DinÃ¢mica para SEO e TÃ­tulo da Aba
export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}): Promise<Metadata> {
  const { year, month } = await params;
  const monthName = releaseMonthNames[Number(month) - 1] || month;

  return {
    title: `AtualizaÃ§Ãµes de ${monthName} de ${year}`,
    description: `Confira as melhorias e correÃ§Ãµes lanÃ§adas em ${monthName} de ${year}.`,
  };
}

// 2. Componente de PÃ¡gina (Server Component)
export default async function MonthlyReleasePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;

  // ValidaÃ§Ã£o bÃ¡sica
  const monthIndex = Number(month);
  if (isNaN(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return notFound();
  }

  const allReleases = await getReleases();

  // Filtramos apenas pelo mÃªs/ano no servidor.
  // Deixamos a separaÃ§Ã£o (Bug/Melhoria) para o Client Component fazer via abas.
  const releasesForMonth = allReleases.filter((release) => {
    if (!release.isoDate) return false;
    const [releaseYear, releaseMonth] = release.isoDate.split("-");
    return releaseYear === year && releaseMonth === month;
  });

  // Se nÃ£o houver nada para este mÃªs (URL manual invÃ¡lida), 404
  if (!releasesForMonth || releasesForMonth.length === 0) {
    return notFound();
  }

  // Passamos os dados para o componente interativo
  return (
    <ReleasesClientPage
      initialReleases={releasesForMonth}
      year={year}
      month={month}
    />
  );
}



