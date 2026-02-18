import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReleases } from "@/core/application/use-cases/get-releases.use-case";
import { ReleasesClientPage } from "@/components/releases/client-page";
import { monthNames } from "@/core/infrastructure/mappers/zammad-release.mapper";

// Mantém a geração estática para performance máxima em docs
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
    .filter(Boolean)
    .map((dateStr) => {
      const [year, month] = (dateStr as string).split("/");
      return { year, month };
    });
}

// 1. Geração de Metadata Dinâmica para SEO e Título da Aba
export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}): Promise<Metadata> {
  const { year, month } = await params;
  const monthName = monthNames[Number(month) - 1] || month;

  return {
    title: `Atualizações de ${monthName} de ${year}`,
    description: `Confira as melhorias e correções lançadas em ${monthName} de ${year}.`,
  };
}

// 2. Componente de Página (Server Component)
export default async function MonthlyReleasePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;

  // Validação básica
  const monthIndex = Number(month);
  if (isNaN(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return notFound();
  }

  const allReleases = await getReleases();

  // Filtramos apenas pelo mês/ano no servidor.
  // Deixamos a separação (Bug/Melhoria) para o Client Component fazer via abas.
  const releasesForMonth = allReleases.filter((release) => {
    if (!release.isoDate) return false;
    const [releaseYear, releaseMonth] = release.isoDate.split("-");
    return releaseYear === year && releaseMonth === month;
  });

  // Se não houver nada para este mês (URL manual inválida), 404
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