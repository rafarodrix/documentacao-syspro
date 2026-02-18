import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-24 relative overflow-hidden border-t border-border/40">

      {/* --- Background Magic --- */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        {/* Grid Pattern Sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Glow Radial de Fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      </div>

      <div className="container px-4 relative z-10">
        {/* Card Centralizado com efeito Glass */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-background/40 backdrop-blur-md px-6 py-16 sm:px-16 sm:py-24 text-center shadow-2xl ring-1 ring-white/5">

          {/* Efeito de Luz Interna no Card */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-50" />

          {/* Badge Decorativa */}
          <div className="mx-auto mb-8 flex w-fit items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="mr-2 h-4 w-4 text-primary fill-primary/20" />
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">Pronto para começar?</span>
          </div>

          {/* Título com Gradiente */}
          <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl leading-tight mb-6">
            Sua operação Syspro em <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              outro nível de eficiência.
            </span>
          </h2>

          {/* Descrição */}
          <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed mb-10">
            Junte-se às empresas líderes que confiam na <strong>Trilink</strong> para garantir estabilidade, compliance fiscal e inovação contínua.
          </p>

          {/* Botões de Ação */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row items-center">

            <Link href="/login">
              {/* Shimmer Button Effect (Botão com brilho passando) */}
              <Button size="lg" className="group relative h-14 overflow-hidden rounded-full bg-primary px-8 text-primary-foreground shadow-xl transition-all hover:scale-105 hover:shadow-primary/25">
                {/* Camada de brilho animada */}
                <div className="absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 ease-in-out" />

                <span className="relative flex items-center gap-2 font-semibold text-lg">
                  Acessar Portal Agora
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>

            <Link href="/contato">
              <Button variant="outline" size="lg" className="h-14 px-8 rounded-full border-primary/20 bg-background/50 hover:bg-accent/50 hover:text-foreground transition-all text-base">
                Falar com Consultor
              </Button>
            </Link>

          </div>

          {/* Rodapé do CTA (Social Proof ou info extra) */}
          <p className="mt-8 text-xs text-muted-foreground">
            Acesso imediato para clientes ativos • Suporte especializado
          </p>
        </div>
      </div>
    </section>
  );
}