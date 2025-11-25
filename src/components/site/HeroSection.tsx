import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Library, History, LifeBuoy, FileText, Database, Code2, Settings } from "lucide-react";

interface HeroSectionProps {
  currentVersion: string;
  releaseLink: string;
}

export function HeroSection({ currentVersion, releaseLink }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <GridBackground />

      {/* 1. Efeito de Glow Central (Ambient Light) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full -z-10 pointer-events-none opacity-50 dark:opacity-30" />

      {/* 2. Elementos Flutuantes Decorativos (Tech Atmosphere) */}
      <FloatingElements />

      <div className="container px-4 md:px-6 mx-auto text-center relative z-10">

        {/* Badge Animado */}
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Link href={releaseLink}>
            <ReleaseBadge currentVersion={currentVersion} />
          </Link>
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          Expertise <span className="text-primary relative inline-block">
            Trilink
            {/* Pequeno brilho atrás da marca */}
            <span className="absolute inset-0 bg-primary/20 blur-xl -z-10"></span>
          </span> para <br className="hidden md:block" />
          elevar o seu{" "}
          <span className="relative inline-block pb-1">
            {/* Gradiente adaptativo (Escuro no Light Mode / Branco no Dark Mode) */}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-white dark:to-white/60">
              Syspro ERP
            </span>

            {/* Adorno sutil abaixo da palavra chave */}
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary opacity-60 dark:opacity-40" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </span>.
        </h1>

        {/* Descrição Refinada */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          Acesse a base de conhecimento oficial da <strong>Trilink Software</strong>. Documentação completa, releases e ferramentas exclusivas para você extrair o máximo do seu aplicativo.
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300">
              Acessar Portal do Cliente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <Link href="/docs" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-base font-medium 
                bg-background/60 backdrop-blur-sm border-input hover:bg-accent hover:text-accent-foreground
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-white/20 transition-all duration-300"
            >
              <BookOpen className="mr-2 h-4 w-4" />
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

/* --- Subcomponentes Locais --- */

function GridBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
      {/* Background Gradient Base (Suave) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>

      {/* Grid Pattern (Funciona em ambos os temas) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      {/* Noise Texture (Opcional) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  );
}

function FloatingElements() {
  return (
    <>
      {/* Ícone Esquerda Superior */}
      <div className="absolute top-1/4 left-[10%] text-primary/10 animate-pulse duration-[4000ms] hidden lg:block">
        <FileText size={64} strokeWidth={1} className="rotate-[-12deg]" />
      </div>

      {/* Ícone Direita Superior */}
      <div className="absolute top-[20%] right-[12%] text-primary/10 animate-bounce duration-[5000ms] hidden lg:block">
        <Database size={56} strokeWidth={1} className="rotate-[12deg]" />
      </div>

      {/* Ícone Esquerda Inferior */}
      <div className="absolute bottom-[20%] left-[15%] text-primary/5 animate-bounce duration-[6000ms] hidden lg:block">
        <Code2 size={48} strokeWidth={1} className="rotate-[6deg]" />
      </div>

      {/* Ícone Direita Inferior */}
      <div className="absolute bottom-[15%] right-[10%] text-primary/5 animate-pulse duration-[4000ms] hidden lg:block">
        <Settings size={64} strokeWidth={1} className="rotate-[-6deg]" />
      </div>
    </>
  );
}

function ReleaseBadge({ currentVersion }: { currentVersion: string }) {
  return (
    <div className="group inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-background/50 backdrop-blur-md transition-all hover:bg-primary/5 hover:border-primary/40 cursor-pointer shadow-sm hover:shadow-md">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        Portal <span className="font-bold text-primary">{currentVersion}</span> disponível
      </span>
      <span className="ml-1 text-muted-foreground/40">|</span>
      <span className="text-xs text-muted-foreground group-hover:text-primary group-hover:underline transition-colors flex items-center gap-1">
        Ver novidades <ArrowRight className="h-3 w-3" />
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
    <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap justify-center gap-8 md:gap-16">
      {features.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-default">
          <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
            <item.icon className="w-5 h-5 text-primary/80 group-hover:text-primary transition-colors" />
          </div>
          {item.text}
        </div>
      ))}
    </div>
  );
}