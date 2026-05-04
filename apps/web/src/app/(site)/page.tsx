import { Metadata } from "next";

// 1. Importacao dos componentes modulares.
import { HeroSection } from "@/components/site/hero-section";
import { TrilinkEcosystem } from "@/components/site/trilink-ecosystem";
import { DownloadsSection } from "@/components/site/downloads-section";
import { FinalCTA } from "@/components/site/final-cta";

// 2. Logica de negocio e tipos.
import { getReleases } from "@/features/releases/application/release-read.queries";
import { groupReleasesByMonth } from "@/features/releases/domain/release-grouping";
import { Release } from "@dosc-syspro/core";

// Configuracao de revalidacao (ISR).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trilink Software | Portal do Cliente e Documentacao Syspro",
  description:
    "Centralize documentacao, ferramentas fiscais e suporte tecnico em uma plataforma desenhada para escalar a eficiencia da sua operacao Syspro ERP.",
};

export default async function LandingPage() {
  const now = new Date();

  const allReleases: Release[] = await getReleases();
  const monthlySummaries = groupReleasesByMonth(allReleases).slice(0, 3);
  const latestRelease = monthlySummaries[0];
  const currentVersion = latestRelease
    ? `v${latestRelease.year}.${latestRelease.month}`
    : `v${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
  const releaseLink = latestRelease
    ? `/portal/releases/${latestRelease.year}/${latestRelease.month}`
    : "/portal/releases";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection currentVersion={currentVersion} releaseLink={releaseLink} />
      <TrilinkEcosystem summaries={monthlySummaries} releaseLink={releaseLink} />
      <DownloadsSection />
      <FinalCTA />
    </main>
  );
}


