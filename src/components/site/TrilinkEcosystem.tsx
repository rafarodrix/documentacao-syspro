import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  Activity
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
      {/* Background Decorativo Sutil */}
      <div className="absolute inset-0 bg-muted/5 -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />

      {/* Efeito de luz ambiente lateral */}
      <div className="absolute top-1/4 -right-[20%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

      <div className="container px-4 md:px-6 mx-auto">

        {/* Cabeçalho da Seção */}
        <div className="mb-16 md:text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            O Hub de Inteligência do seu ERP
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Centralizamos a expertise técnica da Trilink em ferramentas que transformam a maneira como sua equipe interage com o Syspro.
          </p>
        </div>

        {/* Grid Bento (Layout Moderno) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">

          {/* 1. Card: Base de Conhecimento (Largo - Topo Esquerda) */}
          <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 hover:border-primary/20 transition-all duration-500 shadow-sm hover:shadow-md">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
              <BookText className="w-32 h-32 -mr-10 -mt-10 rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Documentação Viva</h3>
                <p className="text-muted-foreground max-w-md">
                  Não apenas manuais. Acesse guias interativos, referências de API e boas práticas validadas pelos nossos consultores sêniores.
                </p>
              </div>

              <div className="mt-8">
                <Link href="/docs" className="inline-flex items-center text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors group/link">
                  Acessar Biblioteca <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* 2. Card: Suporte (Vertical - Direita) */}
          <div className="md:row-span-2 group rounded-3xl border border-white/10 bg-background/50 p-8 hover:border-primary/30 transition-all hover:bg-white/5 flex flex-col justify-between shadow-sm hover:shadow-md">
            <div>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                <Headset className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Suporte Trilink</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Conexão direta com quem entende do seu negócio. Abertura de chamados, rastreamento de SLA e suporte remoto especializado.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground/80 mb-8">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" /> Atendimento Prioritário</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Consultoria Técnica</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Análise de Logs</li>
              </ul>
            </div>

            {/* Integração WhatsApp */}
            <Link
              href="https://wa.me/5534997713731?text=Gostaria%20de%20falar%20com%20o%20Suporte"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all group/btn">
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar no WhatsApp
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
              </Button>
            </Link>
          </div>

          {/* 3. Card: Ferramentas (Pequeno - Meio Esquerda) */}
          <div className="rounded-3xl border border-white/10 bg-background/50 p-8 hover:border-orange-500/30 transition-all hover:bg-white/5 group shadow-sm hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Terminal className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Syspro Tools</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Validadores XML, scripts SQL e utilitários de automação para facilitar o dia a dia.
            </p>
          </div>

          {/* 4. [NOVO] Card: Dúvidas Frequentes (Pequeno - Meio Centro) */}
          {/* Preenche o buraco ao lado de Syspro Tools */}
          <div className="rounded-3xl border border-white/10 bg-background/50 p-8 hover:border-pink-500/30 transition-all hover:bg-white/5 group shadow-sm hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                <HelpCircle className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Dúvidas Frequentes</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-4">
              Respostas rápidas para as perguntas mais comuns sobre configuração e uso do ERP.
            </p>
            <Link href="/docs/duvidas" className="text-xs font-semibold text-pink-500 hover:text-pink-400 flex items-center">
              Ver FAQ <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          {/* 5. Card: Release Notes (Largo - Baixo Esquerda) */}
          <div className="md:col-span-2 rounded-3xl border border-white/10 bg-background/30 p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-purple-500/50 blur-[50px] rounded-full" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-none">Ciclo de Atualizações</h3>
                  <span className="text-xs text-muted-foreground">Evolução contínua do produto</span>
                </div>
              </div>
              <Link href={releaseLink} className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center group/roadmap">
                Ver Roadmap Completo <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/roadmap:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
              {summaries.length > 0 ? (
                summaries.map((summary) => (
                  <Link
                    key={`${summary.year}-${summary.month}`}
                    href={`/docs/suporte/release/${summary.year}/${summary.month}`}
                    className="group/card block p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm mb-3 text-foreground/90">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground group-hover/card:text-foreground transition-colors" />
                      {summary.monthName} <span className="text-xs opacity-50">/{summary.year}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-500">
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Melhorias</span>
                        <span className="font-mono font-bold">{summary.melhorias}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <span className="flex items-center gap-1.5"><Bug className="w-3 h-3" /> Correções</span>
                        <span className="font-mono font-bold">{summary.bugs}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-3 py-8 text-center border border-dashed border-white/10 rounded-xl text-muted-foreground text-sm">
                  Nenhuma atualização recente encontrada.
                </div>
              )}
            </div>
          </div>

          {/* 6. [NOVO] Card: Status do Sistema (Pequeno - Baixo Direita) */}
          {/* Preenche o buraco ao lado de Release Notes */}
          <div className="rounded-3xl border border-white/10 bg-background/50 p-8 hover:border-emerald-500/30 transition-all hover:bg-white/5 group shadow-sm hover:shadow-md flex flex-col justify-center items-center text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-1">Status do Sistema</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Todos os serviços operacionais
            </div>
            <Link href="/status" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              Ver histórico de incidentes
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}