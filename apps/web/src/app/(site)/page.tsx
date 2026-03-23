import { Metadata } from "next";

// 1. ImportaÃ§Ã£o dos Componentes Modulares
// Certifique-se de que os arquivos existem em src/components/site/
import { HeroSection } from "@/components/site/HeroSection";
import { TrilinkEcosystem } from "@/components/site/TrilinkEcosystem";
import { FinalCTA } from "@/components/site/FinalCTA";

// 2. LÃ³gica de NegÃ³cio e Tipos
import { getReleases } from "@/core/application/use-cases/get-releases.use-case";
import { groupReleasesByMonth } from "@/lib/releases-helpers";
import { Release } from "@dosc-syspro/core";

// ConfiguraÃ§Ã£o de RevalidaÃ§Ã£o (ISR)
export const revalidate = 3600; // 1 hora

export const metadata: Metadata = {
  title: "Trilink Software | Portal do Cliente e DocumentaÃ§Ã£o Syspro",
  description: "Centralize documentaÃ§Ã£o, ferramentas fiscais e suporte tÃ©cnico em uma plataforma desenhada para escalar a eficiÃªncia da sua operaÃ§Ã£o Syspro ERP.",
};

export default async function LandingPage() {
  // --- PREPARAÃ‡ÃƒO DOS DADOS (Server Side) ---

  // 1. Calculando versÃ£o atual baseada na data (Ex: v2024.11)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const currentVersion = `v${year}.${month}`;
  const releaseLink = `/releases/${year}/${month}`;

  // 2. Buscando releases do CMS/Banco de Dados
  const allReleases: Release[] = await getReleases();

  // 3. Processando os dados para o resumo (apenas os 3 meses mais recentes)
  const monthlySummaries = groupReleasesByMonth(allReleases).slice(0, 3);

  // --- RENDERIZAÃ‡ÃƒO ---
  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">

      {/* SeÃ§Ã£o 1: Hero (Topo, ApresentaÃ§Ã£o e Badge) */}
      <HeroSection
        currentVersion={currentVersion}
        releaseLink={releaseLink}
      />

      {/* SeÃ§Ã£o 2: Ecossistema (Features, Grid Bento e Lista de Releases) */}
      <TrilinkEcosystem
        summaries={monthlySummaries}
        releaseLink={releaseLink}
      />

      {/* SeÃ§Ã£o 3: Call to Action (RodapÃ© da pÃ¡gina) */}
      <FinalCTA />

    </main>
  );
}