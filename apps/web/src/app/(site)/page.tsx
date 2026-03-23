import { Metadata } from "next";

// 1. Importação dos Componentes Modulares
// Certifique-se de que os arquivos existem em src/components/site/
import { HeroSection } from "@/components/site/HeroSection";
import { TrilinkEcosystem } from "@/components/site/TrilinkEcosystem";
import { FinalCTA } from "@/components/site/FinalCTA";

// 2. Lógica de Negócio e Tipos
import { getReleases } from "@/core/application/use-cases/get-releases.use-case";
import { groupReleasesByMonth } from "@/lib/releases-helpers";
import { Release } from "@/core/domain/entities/release.entity";

// Configuração de Revalidação (ISR)
export const revalidate = 3600; // 1 hora

export const metadata: Metadata = {
  title: "Trilink Software | Portal do Cliente e Documentação Syspro",
  description: "Centralize documentação, ferramentas fiscais e suporte técnico em uma plataforma desenhada para escalar a eficiência da sua operação Syspro ERP.",
};

export default async function LandingPage() {
  // --- PREPARAÇÃO DOS DADOS (Server Side) ---

  // 1. Calculando versão atual baseada na data (Ex: v2024.11)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const currentVersion = `v${year}.${month}`;
  const releaseLink = `/releases/${year}/${month}`;

  // 2. Buscando releases do CMS/Banco de Dados
  const allReleases: Release[] = await getReleases();

  // 3. Processando os dados para o resumo (apenas os 3 meses mais recentes)
  const monthlySummaries = groupReleasesByMonth(allReleases).slice(0, 3);

  // --- RENDERIZAÇÃO ---
  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">

      {/* Seção 1: Hero (Topo, Apresentação e Badge) */}
      <HeroSection
        currentVersion={currentVersion}
        releaseLink={releaseLink}
      />

      {/* Seção 2: Ecossistema (Features, Grid Bento e Lista de Releases) */}
      <TrilinkEcosystem
        summaries={monthlySummaries}
        releaseLink={releaseLink}
      />

      {/* Seção 3: Call to Action (Rodapé da página) */}
      <FinalCTA />

    </main>
  );
}