import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Terminal,
  LayoutGrid,
  Headset,
  BookText,
  MessageCircle,
  HelpCircle,
  Activity,
  ExternalLink
} from "lucide-react";
import type { ReleaseMonthSummary } from "@/features/releases/domain/release-grouping";
import { ReleaseCycleCard } from "@/components/releases/release-cycle-card";

interface TrilinkEcosystemProps {
  summaries: ReleaseMonthSummary[];
  releaseLink: string;
}

export function TrilinkEcosystem({ summaries, releaseLink }: TrilinkEcosystemProps) {
  return (
    <section className="py-24 relative overflow-hidden" id="features">

      {/* --- Background Elements (Magic UI) --- */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.10]" />
      </div>

      {/* Luz Ambiente */}
      <div className="absolute top-1/3 right-0 -translate-y-1/2 w-200 h-200 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-150 h-150 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="container px-4 md:px-6 mx-auto max-w-7xl">

        {/* Cabecalho da secao */}
        <div className="mb-20 md:text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
            Ecossistema Integrado
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
            O Hub de Inteligência do seu ERP
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Centralizamos a expertise técnica da Trilink em ferramentas modernas que transformam a maneira como sua equipe interage com o Syspro.
          </p>
        </div>

        {/* --- BENTO GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">

          {/* 1. Card: Base de Conhecimento (Largo - Topo Esquerda) */}
          <Card className="md:col-span-2 group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-xl transition-all duration-500 hover:border-primary/20">
            {/* Background Gradient on Hover */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110">
              <BookText className="w-40 h-40 -mr-12 -mt-12 rotate-12 text-foreground" />
            </div>

            <CardContent className="relative z-10 flex flex-col h-full justify-between p-8">
              <div>
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-blue-600 transition-colors">
                  Documentação Viva
                </h3>
                <p className="text-muted-foreground max-w-md text-base">
                  Não apenas manuais. Acesse guias interativos, referências de API e boas práticas validadas pelos nossos consultores sêniores.
                </p>
              </div>

              <div className="mt-8">
                <Link href="/portal/docs" className="inline-flex items-center text-sm font-semibold text-foreground hover:text-blue-500 transition-colors group/link">
                  Acessar Biblioteca <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 2. Card: Suporte (Vertical - Direita) */}
          <Card className="md:row-span-2 group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-xl transition-all duration-500 hover:border-primary/20 flex flex-col">
            <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="relative z-10 flex flex-col h-full justify-between p-8">
              <div>
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                  <Headset className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">Suporte Trilink</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  Conexão direta com quem entende do seu negócio. Abertura de chamados, rastreamento de SLA e suporte remoto especializado.
                </p>

                <ul className="space-y-4 text-sm text-muted-foreground/90 mb-8">
                  <li className="flex items-center gap-3">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    Atendimento Prioritário
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                    Consultoria Técnica
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                    Análise de Logs
                  </li>
                </ul>
              </div>

              <Link
                href="https://wa.me/5534997713731?text=Gostaria%20de%20falar%20com%20o%20Suporte"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-auto"
              >
                <Button className="w-full shadow-lg shadow-primary/10 hover:shadow-primary/25 transition-all group/btn">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar no WhatsApp
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 3. Card: Ferramentas (Pequeno - Meio Esquerda) */}
          <Card className="group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-orange-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative z-10 p-6 flex flex-col h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-orange-600 transition-colors">Syspro Tools</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">
                Validadores XML, scripts SQL e utilitários de automação para facilitar o dia a dia.
              </p>
              <Link href="/portal/tools" className="flex items-center text-xs font-medium text-orange-500 gap-1 group-hover:translate-x-1 transition-transform">
                Acessar Tools <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* 4. Card: Duvidas frequentes */}
          <Card className="group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-pink-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative z-10 p-6 flex flex-col h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-pink-600 transition-colors">FAQ & Dúvidas</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">
                Respostas rápidas para as perguntas mais comuns sobre configuração e uso do ERP.
              </p>
              <Link href="/portal/docs/duvidas" className="flex items-center text-xs font-medium text-pink-500 gap-1 group-hover:translate-x-1 transition-transform">
                Ver Respostas <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* 5. Card: Release Notes (Largo - Baixo Esquerda) */}
          <ReleaseCycleCard
            summaries={summaries}
            releaseLink={releaseLink}
            className="md:col-span-2"
            title="Ciclo de Atualizações"
            description="Evolução contínua do produto"
            ctaLabel="Roadmap Completo"
          />

          {/* 6. Card: Status do Sistema (Pequeno - Baixo Direita) */}
          <Card className="group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-emerald-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative z-10 p-6 flex flex-col h-full justify-center items-center text-center">
              <div className="mb-4 relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Activity className="h-7 w-7" />
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2">Status do Sistema</h3>

              <div className="mb-4 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Operacional
              </div>

              <Link href="/status" className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
                Histórico de incidentes <ExternalLink className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </section>
  );
}

