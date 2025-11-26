import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Library, History, LifeBuoy, FileText, Database, Code2, Settings, Sparkles, ChevronRight } from "lucide-react";

interface HeroSectionProps {
  currentVersion: string;
  releaseLink: string;
}

export function HeroSection({ currentVersion, releaseLink }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Elements */}
      <GridBackground />
      <Spotlight />

      {/* Elementos Flutuantes (Decorativos) */}
      <FloatingElements />

      <div className="container px-4 md:px-6 mx-auto text-center relative z-10">

        {/* Badge Animado (Shiny Effect) */}
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <Link href={releaseLink}>
            <ReleaseBadge currentVersion={currentVersion} />
          </Link>
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          A <span className="text-primary relative inline-block">
            Central
            {/* Brilho intenso atrás da marca */}
            <span className="absolute inset-0 bg-primary/40 blur-3xl -z-10 opacity-50"></span>
          </span> Oficial <br className="hidden md:block" />
          do{" "}
          <span className="relative inline-block pb-1">
            {/* Gradiente de Texto Premium */}
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 dark:from-white dark:to-white/60">
              Syspro ERP
            </span>

            {/* Sublinhado Curvo */}
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary opacity-80" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
          </span>.
        </h1>

        {/* Descrição */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          Acesse a documentação oficial do <strong>Syspro ERP</strong>. Guias, tutoriais, releases, boas práticas e ferramentas exclusivas da Trilink para apoiar seu dia a dia..
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 bg-primary hover:bg-primary/90">
              Acessar Portal do Cliente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <Link href="/docs" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-base font-medium 
                bg-background/50 backdrop-blur-md border-input hover:bg-accent/50 hover:text-accent-foreground
                transition-all duration-300 group"
            >
              <BookOpen className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              Explorar Documentação
            </Button>
          </Link>
        </div>

        {/* Features Rodapé do Hero */}
        <div className="animate-in fade-in duration-1000 delay-700">
          <HeroFeatures />
        </div>
      </div>
    </section>
  );
}

/* --- Subcomponentes Visuais --- */

function GridBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
      {/* Gradiente de Fundo Suave */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>

      {/* Grid Pattern com Mask Radial (Magic UI Style) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
    </div>
  );
}

function Spotlight() {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/10 blur-[120px] rounded-full -z-10 pointer-events-none opacity-60 dark:opacity-40 mix-blend-screen" />
  );
}

function FloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Elementos com animação flutuante (float) */}
      <div className="absolute top-[15%] left-[5%] text-foreground/5 animate-float delay-0 hidden xl:block">
        <FileText size={80} strokeWidth={0.5} className="-rotate-12" />
      </div>

      <div className="absolute top-[20%] right-[5%] text-foreground/5 animate-float delay-1000 hidden xl:block">
        <Database size={90} strokeWidth={0.5} className="rotate-12" />
      </div>

      <div className="absolute bottom-[20%] left-[10%] text-foreground/5 animate-float delay-2000 hidden xl:block">
        <Code2 size={60} strokeWidth={0.5} className="rotate-6" />
      </div>

      <div className="absolute bottom-[25%] right-[8%] text-foreground/5 animate-float delay-3000 hidden xl:block">
        <Settings size={70} strokeWidth={0.5} className="-rotate-6" />
      </div>
    </div>
  );
}

function ReleaseBadge({ currentVersion }: { currentVersion: string }) {
  return (
    <div className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-background/80 backdrop-blur-xl hover:border-primary/40 transition-all cursor-pointer group overflow-hidden">

      {/* Efeito Shimmer (Brilho passando) */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent z-0"></div>

      <span className="relative flex h-2 w-2 z-10">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>

      <span className="relative z-10 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        Portal <span className="font-bold text-primary">{currentVersion}</span> disponível
      </span>

      <span className="relative z-10 ml-1 flex items-center text-xs text-muted-foreground/60 group-hover:text-primary transition-colors">
        | <span className="ml-2 hover:underline flex items-center gap-1">Novidades <ChevronRight className="h-3 w-3" /></span>
      </span>
    </div>
  );
}

function HeroFeatures() {
  const features = [
    { icon: Library, text: "Base de Conhecimento" },
    { icon: History, text: "Histórico de Versões" },
    { icon: LifeBuoy, text: "Suporte Especializado" },
  ];

  return (
    <div className="mt-20 pt-8 border-t border-border/30 flex flex-wrap justify-center gap-8 md:gap-16 relative">
      {/* Luz sutil na borda */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {features.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-default">
          <div className="relative p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <item.icon className="relative z-10 w-5 h-5 text-primary/70 group-hover:text-primary transition-colors" />
          </div>
          {item.text}
        </div>
      ))}
    </div>
  );
}