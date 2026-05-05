import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReleases } from "@/features/releases/application/release-read.queries";
import { ReleasesClientPage } from "@/components/releases/client-page";
import { releaseMonthNames } from "@/features/releases/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}): Promise<Metadata> {
  const { year, month } = await params;
  const monthName = releaseMonthNames[Number(month) - 1] || month;

  return {
    title: `Atualizacoes de ${monthName} de ${year}`,
    description: `Confira as melhorias e correcoes lancadas em ${monthName} de ${year}.`,
  };
}

export default async function MonthlyReleasePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;

  const monthIndex = Number(month);
  if (Number.isNaN(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return notFound();
  }

  const allReleases = await getReleases();
  const releasesForMonth = allReleases.filter((release) => {
    if (!release.isoDate) return false;
    const [releaseYear, releaseMonth] = release.isoDate.split("-");
    return releaseYear === year && releaseMonth === month;
  });

  if (!releasesForMonth.length) {
    return notFound();
  }

  return (
    <ReleasesClientPage
      initialReleases={releasesForMonth}
      year={year}
      month={month}
    />
  );
}
