import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Terminal,
  BarChart3,
  Calendar,
  Sparkles,
  Bug,
  LayoutGrid,
  Headset,
  BookText,
  MessageCircle,
  HelpCircle,
  Activity,
  ExternalLink
} from "lucide-react";

interface ReleaseSummary {
  year: string;
  month: string;
  monthName: string;
  melhorias: number;
  bugs: number;
}

interface TrilinkEcosystemProps {
  summaries: ReleaseSummary[];
  releaseLink: string;
}

export function TrilinkEcosystem({ summaries, releaseLink }: TrilinkEcosystemProps) {
  return (
    <section className="py-24 relative overflow-hidden" id="features">

      {/* --- Background Elements (Magic UI) --- */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.1] dark:opacity-[0.05]" />
      </div>

      {/* Luz Ambiente */}
      <div className="absolute top-1/3 right-0 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="container px-4 md:px-6 mx-auto max-w-7xl">

        {/* Cabeçalho da Seção */}
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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110">
              <BookText className="w-40 h-40 -mr-12 -mt-12 rotate-12 text-foreground" />
            </div>

            <CardContent className="relative z-10 flex flex-col h-full justify-between p-8">
              <div>
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Documentação Viva
                </h3>
                <p className="text-muted-foreground max-w-md text-base">
                  Não apenas manuais. Acesse guias interativos, referências de API e boas práticas validadas pelos nossos consultores sêniores.
                </p>
              </div>

              <div className="mt-8">
                <Link href="/docs" className="inline-flex items-center text-sm font-semibold text-foreground hover:text-blue-500 transition-colors group/link">
                  Acessar Biblioteca <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 2. Card: Suporte (Vertical - Direita) */}
          <Card className="md:row-span-2 group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-xl transition-all duration-500 hover:border-primary/20 flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

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
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative z-10 p-6 flex flex-col h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Syspro Tools</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">
                Validadores XML, scripts SQL e utilitários de automação para facilitar o dia a dia.
              </p>
              <Link href="/tools" className="flex items-center text-xs font-medium text-orange-500 gap-1 group-hover:translate-x-1 transition-transform">
                Acessar Tools <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* 4. Card: Dúvidas Frequentes (Pequeno - Meio Centro) */}
          <Card className="group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-pink-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative z-10 p-6 flex flex-col h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">FAQ & Dúvidas</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">
                Respostas rápidas para as perguntas mais comuns sobre configuração e uso do ERP.
              </p>
              <Link href="/docs/duvidas" className="flex items-center text-xs font-medium text-pink-500 gap-1 group-hover:translate-x-1 transition-transform">
                Ver Respostas <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* 5. Card: Release Notes (Largo - Baixo Esquerda) */}
          <Card className="md:col-span-2 relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-purple-500/30">
            {/* Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

            <CardContent className="relative z-10 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-none mb-1">Ciclo de Atualizações</h3>
                    <span className="text-sm text-muted-foreground">Evolução contínua do produto</span>
                  </div>
                </div>
                <Link href={releaseLink} className="text-sm font-medium text-purple-500 hover:text-purple-400 transition-colors flex items-center gap-1 group">
                  Roadmap Completo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {summaries.length > 0 ? (
                  summaries.map((summary) => (
                    <Link
                      key={`${summary.year}-${summary.month}`}
                      href={`/releases/${summary.year}/${summary.month}`}
                      className="group/card block p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-purple-500/30 transition-all hover:-translate-y-1 shadow-sm"
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm mb-3 text-foreground">
                        <Calendar className="w-4 h-4 text-muted-foreground group-hover/card:text-purple-500 transition-colors" />
                        {summary.monthName} <span className="text-xs opacity-50 font-normal">/{summary.year}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                          <span className="flex items-center gap-1.5 font-medium"><Sparkles className="w-3 h-3" /> Melhorias</span>
                          <span className="font-bold font-mono">{summary.melhorias}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                          <span className="flex items-center gap-1.5 font-medium"><Bug className="w-3 h-3" /> Correções</span>
                          <span className="font-bold font-mono">{summary.bugs}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-3 py-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm">
                    Nenhuma atualização recente.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 6. Card: Status do Sistema (Pequeno - Baixo Direita) */}
          <Card className="group relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-emerald-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative z-10 p-6 flex flex-col h-full justify-center items-center text-center">
              <div className="mb-4 relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Activity className="h-7 w-7" />
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2">Status do Sistema</h3>

              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-4">
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