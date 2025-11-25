import Link from "next/link";
import { Button } from "@/components/ui/button";

// Icons
import {
  ArrowRight, BookOpen, ShieldCheck, CheckCircle2, Zap,
  FileText, LifeBuoy, Terminal, BarChart3, Calendar,
  Sparkles, Bug
} from "lucide-react";

// Releases
import { getReleases } from "@/core/application/use-cases/get-releases";
import { groupReleasesByMonth } from "@/lib/releases-helpers";
import { Release } from "@/core/domain/entities/release";

export const revalidate = 3600; // 1h

export default async function LandingPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const currentVersion = `v${year}.${month}`;
  const releaseLink = `/docs/suporte/release/${year}/${month}`;

  const allReleases: Release[] = await getReleases();
  const monthlySummaries = groupReleasesByMonth(allReleases).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ============================================
          HERO
      ============================================= */}
      <HeroSection currentVersion={currentVersion} releaseLink={releaseLink} />

      {/* ============================================
          FEATURES
      ============================================= */}
      <FeaturesSection summaries={monthlySummaries} releaseLink={releaseLink} />

      {/* ============================================
          CTA FINAL
      ============================================= */}
      <FinalCTA />

    </div>
  );
}

/* =======================================================
   COMPONENTES SEPARADOS (Melhor organização e leitura)
======================================================= */

function HeroSection({ currentVersion, releaseLink }: { currentVersion: string, releaseLink: string }) {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32">
      <GridBackground />

      <div className="container px-4 md:px-6 mx-auto text-center">

        {/* Badge */}
        <div className="inline-flex items-center justify-center mb-8 hover:scale-105 transition-all">
          <Link href={releaseLink}>
            <ReleaseBadge currentVersion={currentVersion} />
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-6xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
          A inteligência que o seu <br className="hidden md:block" />
          <span className="text-primary">Syspro ERP</span> precisava.
        </h1>

        {/* Description */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Centralize documentação, ferramentas fiscais e suporte técnico em uma plataforma desenhada para escalar a eficiência da sua operação.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/login">
            <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30">
              Acessar Portal do Cliente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <Link href="/docs">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base font-medium bg-background/50 backdrop-blur-sm border-muted-foreground/20 hover:bg-muted/50"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Explorar Documentação
            </Button>
          </Link>
        </div>

        {/* Features */}
        <HeroFeatures />
      </div>
    </section>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 -z-10 bg-background
      bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),
          linear-gradient(to_bottom,#8080800a_1px,transparent_1px)]
      bg-[size:14px_24px]">
      <div className="absolute left-0 right-0 top-0 m-auto h-[310px] w-[310px]
        rounded-full bg-primary/20 opacity-20 blur-[100px]" />
    </div>
  );
}

function ReleaseBadge({ currentVersion }: { currentVersion: string }) {
  return (
    <span className="relative inline-block overflow-hidden rounded-full p-[1px]">
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite]
        bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      <div className="inline-flex items-center rounded-full bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-3xl">
        <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        Portal {currentVersion} disponível
      </div>
    </span>
  );
}

function HeroFeatures() {
  const items = [
    { icon: ShieldCheck, label: "Segurança Enterprise" },
    { icon: CheckCircle2, label: "Compliance Fiscal" },
    { icon: Zap, label: "Alta Performance" },
  ];

  return (
    <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap justify-center gap-8 md:gap-16 grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-500">
      {items.map(({ icon: Icon, label }, i) => (
        <div key={i} className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="h-5 w-5" /> {label}
        </div>
      ))}
    </div>
  );
}

/* =======================================================
   FEATURES SECTION
======================================================= */

function FeaturesSection({ summaries, releaseLink }: { summaries: any[], releaseLink: string }) {
  return (
    <section className="py-24 bg-muted/20" id="features">
      <div className="container px-4 md:px-6 mx-auto">

        <Header title="Ecossistema completo" description="Da dúvida técnica à resolução de problemas complexos. Tudo o que sua equipe precisa em um único lugar." />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <FeatureCardLarge
            icon={FileText}
            title="Base de Conhecimento"
            description="Acesse manuais detalhados, documentação de APIs e guias passo a passo."
            link="/docs"
          />

          <FeatureCard
            icon={Terminal}
            title="Ferramentas"
            description="Validadores de XML, conversores e scripts de automação para o dia a dia."
            color="blue"
          />

          <FeatureCard
            icon={LifeBuoy}
            title="Suporte Premium"
            description="Abertura de chamados prioritários e acompanhamento de SLA em tempo real."
            color="green"
          />

          <ReleaseAnalytics summaries={summaries} releaseLink={releaseLink} />

        </div>
      </div>
    </section>
  );
}

function Header({ title, description }: { title: string, description: string }) {
  return (
    <div className="mb-16 md:text-center max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
      <p className="text-lg text-muted-foreground">{description}</p>
    </div>
  );
}

/* =======================================================
   CARDS REUSÁVEIS
======================================================= */

function FeatureCard({ icon: Icon, title, description, color }: any) {
  return (
    <div className={`group rounded-3xl border p-8 bg-background hover:border-${color}-500/50 transition-all`}>
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-${color}-500/10 text-${color}-600`}>
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function FeatureCardLarge({ icon: Icon, title, description, link }: any) {
  return (
    <div className="md:col-span-2 group rounded-3xl border bg-gradient-to-br from-background to-muted/50 p-8 hover:border-primary/50 transition-all">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>

      <Link href={link} className="text-sm font-medium text-primary hover:underline inline-flex items-center">
        Acessar documentação <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </div>
  );
}

/* =======================================================
   RELEASE ANALYTICS (DINÂMICO)
======================================================= */

function ReleaseAnalytics({ summaries, releaseLink }: any) {
  return (
    <div className="md:col-span-2 rounded-3xl border p-8 bg-background hover:border-purple-500/50 transition-all">

      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h3 className="text-2xl font-bold">Release Notes & Roadmaps</h3>
      </div>

      <p className="text-muted-foreground mb-6">
        Fique por dentro das últimas atualizações, correções de bugs e o que está por vir.
      </p>

      {/* Lista dinâmica */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summaries.length > 0 ? (
          summaries.map((summary: any) => (
            <Link
              key={`${summary.year}-${summary.month}`}
              href={`/docs/suporte/release/${summary.year}/${summary.month}`}
              className="block p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                {summary.monthName}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-green-500" /> {summary.melhorias} Melhorias
                </div>

                <div className="flex items-center gap-1">
                  <Bug className="w-3 h-3 text-amber-500" /> {summary.bugs} Correções
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-3 text-center text-sm text-muted-foreground py-4 border rounded-lg border-dashed">
            Carregando atualizações...
          </div>
        )}
      </div>

      <Link href={releaseLink} className="text-sm font-medium text-purple-600 hover:underline inline-flex items-center">
        Ver histórico completo <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </div>
  );
}

/* =======================================================
   CTA FINAL
======================================================= */

function FinalCTA() {
  return (
    <section className="py-24 bg-primary/5 text-center">
      <div className="container px-4 md:px-6 mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Pronto para otimizar sua gestão?</h2>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Junte-se a centenas de empresas que utilizam o Portal Trilink para garantir a estabilidade do Syspro ERP.
        </p>

        <Link href="/login">
          <Button size="lg" className="h-14 px-10 text-lg shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
            Acessar Portal Agora
          </Button>
        </Link>
      </div>
    </section>
  );
}
