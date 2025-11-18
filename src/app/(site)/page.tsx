import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  LifeBuoy,
  FileText,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* HERO – Estilo corporativo (TOTVS/Linx/Sankhya) */}
      <section className="relative py-24 md:py-36 border-b bg-gradient-to-b from-background to-muted/20">
        <div className="container px-4 md:px-6 mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
            Versão Atual do Portal: v2025.11
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 max-w-5xl mx-auto">
            A central oficial da <span className="text-primary">Trilink Software</span>  
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Documentação, ferramentas inteligentes, recursos avançados e suporte especializado –
            tudo em um único portal para elevar a eficiência do seu negócio.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base font-medium shadow-lg hover:shadow-xl">
                Entrar no Portal do Cliente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link href="/docs">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium backdrop-blur-sm">
                <BookOpen className="mr-2 h-5 w-5" />
                Acessar Documentação
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Segurança e Estabilidade
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Conteúdo 100% Oficial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Ferramentas Exclusivas da Trilink
            </div>
          </div>

        </div>
      </section>

      {/* FEATURES – Estilo Linx/Sankhya (corporativo, direto e robusto) */}
      <section className="py-24 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">

          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              A estrutura completa para dominar o Syspro ERP
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Criado para equipes de implantação, operação e gestão que exigem
              alta eficiência e precisão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Documentação */}
            <div className="group relative overflow-hidden rounded-2xl border bg-background p-10 hover:shadow-xl transition-all">
              <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20">
                <BookOpen className="w-24 h-24" />
              </div>

              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-semibold mb-3">Documentação Oficial</h3>
              <p className="text-muted-foreground mb-4">
                Guias completos, APIs, manuais e processos detalhados para operação e implantação.
              </p>

              <Link href="/docs" className="text-primary font-medium hover:underline inline-flex items-center">
                Ver documentação <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>

            {/* Ferramentas */}
            <div className="group relative overflow-hidden rounded-2xl border bg-background p-10 hover:shadow-xl transition-all">
              <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20">
                <LayoutDashboard className="w-24 h-24" />
              </div>

              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Zap className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-semibold mb-3">Ferramentas Avançadas</h3>
              <p className="text-muted-foreground mb-4">
                Utilitários exclusivos: analisadores de XML, validações fiscais, conversores e automações.
              </p>

              <Link href="/login" className="text-blue-600 font-medium hover:underline inline-flex items-center">
                Acessar ferramentas <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>

            {/* Suporte */}
            <div className="group relative overflow-hidden rounded-2xl border bg-background p-10 hover:shadow-xl transition-all">
              <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20">
                <ShieldCheck className="w-24 h-24" />
              </div>

              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                <LifeBuoy className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-semibold mb-3">Suporte Técnico Trilink</h3>
              <p className="text-muted-foreground mb-4">
                Abertura de chamados, acompanhamento de tickets e acesso a Release Notes oficiais.
              </p>

              <Link href="/login" className="text-green-600 font-medium hover:underline inline-flex items-center">
                Abrir chamado <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* CTA FINAL – Estilo TOTVS */}
      <section className="py-24 border-t bg-background">
        <div className="container px-4 md:px-6 mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-bold mb-6 max-w-3xl mx-auto">
            Eleve o desempenho do Syspro ERP com o portal oficial da Trilink
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
            Recursos completos, processos padronizados e suporte especializado
            para acelerar sua operação.
          </p>

          <Link href="/login">
            <Button size="lg" className="px-10 h-12 text-base font-medium">
              Acessar Portal do Cliente
            </Button>
          </Link>

        </div>
      </section>

    </div>
  );
}
