import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle"; // Importe o Toggle
import {
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  LifeBuoy,
  FileText,
  CheckCircle2,
  BarChart3,
  Terminal
} from "lucide-react";

export default function LandingPage() {
  // --- LÓGICA DINÂMICA DE DATA ---
  const now = new Date();
  const year = now.getFullYear();
  // Pega o mês (0-11), soma 1 e garante 2 dígitos (ex: "05", "11")
  const month = String(now.getMonth() + 1).padStart(2, "0");
  
  const currentVersion = `v${year}.${month}`;
  const releaseLink = `/releases/${year}/${month}`;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden transition-colors duration-300">
      
      {/* --- HEADER FLUTUANTE (Para o Toggle) --- */}
      <header className="absolute top-0 right-0 p-6 z-50">
        <ModeToggle />
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        
        {/* Background Pattern (Grid) */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        </div>

        <div className="container px-4 md:px-6 mx-auto relative z-10 text-center">
          
          {/* Badge Animado & Dinâmico */}
          <div className="inline-flex items-center justify-center mb-8 transition-all hover:scale-105">
            {/* Envolvemos o badge no Link dinâmico */}
            <Link href={releaseLink}>
              <span className="relative inline-block overflow-hidden rounded-full p-[1px]">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-3xl hover:text-primary transition-colors">
                  <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Portal {currentVersion} disponível
                </div>
              </span>
            </Link>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-6xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            A inteligência que o seu <br className="hidden md:block"/>
            <span className="text-primary">Syspro ERP</span> precisava.
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Centralize documentação, ferramentas fiscais e suporte técnico em uma plataforma desenhada para escalar a eficiência da sua operação.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                Acessar Portal do Cliente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link href="/docs">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium bg-background/50 backdrop-blur-sm border-muted-foreground/20 hover:bg-muted/50">
                <BookOpen className="mr-2 h-5 w-5" />
                Explorar Documentação
              </Button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap justify-center gap-8 md:gap-16 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldCheck className="h-5 w-5" /> Segurança Enterprise
             </div>
             <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5" /> Compliance Fiscal
             </div>
             <div className="flex items-center gap-2 font-semibold text-sm">
                <Zap className="h-5 w-5" /> Alta Performance
             </div>
          </div>

        </div>
      </section>

      {/* --- BENTO GRID FEATURES --- */}
      <section className="py-24 bg-muted/20">
        <div className="container px-4 md:px-6 mx-auto">
          
          <div className="mb-16 md:text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ecossistema completo
            </h2>
            <p className="text-lg text-muted-foreground">
              Da dúvida técnica à resolução de problemas complexos. Tudo o que sua equipe precisa em um único lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card Grande - Docs */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background to-muted/50 p-8 hover:border-primary/50 transition-all duration-300">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Base de Conhecimento</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Acesse manuais detalhados, documentação de APIs e guias passo a passo. A fonte única de verdade para o seu ERP.
                </p>
                <Link href="/docs" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
                  Ler documentação <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              <div className="absolute right-0 bottom-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent" />
            </div>

            {/* Card - Ferramentas */}
            <div className="md:col-span-1 group relative overflow-hidden rounded-3xl border bg-background p-8 hover:border-blue-500/50 transition-all duration-300">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Terminal className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ferramentas</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Validadores de XML, conversores e scripts de automação para o dia a dia.
              </p>
            </div>

            {/* Card - Suporte */}
            <div className="md:col-span-1 group relative overflow-hidden rounded-3xl border bg-background p-8 hover:border-green-500/50 transition-all duration-300">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Suporte Premium</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Abertura de chamados prioritários e acompanhamento de SLA em tempo real.
              </p>
            </div>

            {/* Card Grande - Analytics/Gestão */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-background p-8 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Release Notes & Roadmaps</h3>
                  <p className="text-muted-foreground mb-4">
                    Fique por dentro das últimas atualizações, correções de bugs e o que está por vir no sistema.
                  </p>
                  <Link href={releaseLink} className="text-sm font-medium text-purple-600 hover:underline inline-flex items-center">
                    Ver atualizações <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
                <div className="w-full md:w-1/3 h-32 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-xs text-muted-foreground">
                  [Área de Dashboard]
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-primary/5"></div>
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Pronto para otimizar sua gestão?
          </h2>
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

    </div>
  );
}