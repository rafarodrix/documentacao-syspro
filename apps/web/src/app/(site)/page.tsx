import { Metadata } from "next";

// 1. Importacao dos componentes modulares.
import { HeroSection } from "@/components/site/HeroSection";
import { TrilinkEcosystem } from "@/components/site/TrilinkEcosystem";
import { FinalCTA } from "@/components/site/FinalCTA";

// 2. Logica de negocio e tipos.
import { getReleases } from "@/core/application/use-cases/get-releases.use-case";
import { groupReleasesByMonth } from "@/lib/releases-helpers";
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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const currentVersion = `v${year}.${month}`;
  const releaseLink = `/releases/${year}/${month}`;

  const allReleases: Release[] = await getReleases();
  const monthlySummaries = groupReleasesByMonth(allReleases).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <HeroSection currentVersion={currentVersion} releaseLink={releaseLink} />
      <TrilinkEcosystem summaries={monthlySummaries} releaseLink={releaseLink} />
      <FinalCTA />
    </main>
  );
}
