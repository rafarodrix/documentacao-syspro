import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Library, History, LifeBuoy } from "lucide-react";

interface HeroSectionProps {
  currentVersion: string;
  releaseLink: string;
}

export function HeroSection({ currentVersion, releaseLink }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <GridBackground />

      <div className="container px-4 md:px-6 mx-auto text-center relative z-10">

        {/* Badge Animado */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <Link href={releaseLink}>
            <ReleaseBadge currentVersion={currentVersion} />
          </Link>
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl mx-auto leading-[1.1]">
          Expertise <span className="text-primary">Trilink</span> para <br className="hidden md:block" />
          elevar o seu{" "}
          <span className="relative inline-block pb-1">
            {/* CORREÇÃO: Gradiente adaptativo (Escuro no Light Mode / Branco no Dark Mode) */}
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
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Acesse a base de conhecimento oficial da <strong>Trilink Software</strong>. Documentação completa, releases e ferramentas exclusivas para você extrair o máximo do seu aplicativo.
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
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
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-white/20 transition-all"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Explorar Documentação
            </Button>
          </Link>
        </div>

        {/* Features Rodapé do Hero */}
        <HeroFeatures />
      </div>
    </section>
  );
}

/* --- Subcomponentes Locais --- */

function GridBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
      {/* Background Gradient Base (Suave) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

      {/* Grid Pattern (Funciona em ambos os temas) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      {/* Noise Texture (Opcional, opacidade baixa para não sujar o light mode) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  );
}

function ReleaseBadge({ currentVersion }: { currentVersion: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium backdrop-blur-md transition-colors hover:bg-primary/10 hover:border-primary/30 cursor-pointer">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>
      Portal <span className="font-bold">{currentVersion}</span> disponível
      <span className="ml-1 text-muted-foreground/60">|</span> <span className="hover:underline">Ver novidades &rarr;</span>
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
          <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <item.icon className="w-5 h-5 text-primary/80 group-hover:text-primary transition-colors" />
          </div>
          {item.text}
        </div>
      ))}
    </div>
  );
}