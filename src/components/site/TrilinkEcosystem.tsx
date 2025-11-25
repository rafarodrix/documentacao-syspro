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
  BookText
} from "lucide-react";

interface TrilinkEcosystemProps {
  summaries: any[];
  releaseLink: string;
}

export function TrilinkEcosystem({ summaries, releaseLink }: TrilinkEcosystemProps) {
  return (
    <section className="py-24 relative" id="features">
      {/* Background Decorativo Sutil */}
      <div className="absolute inset-0 bg-muted/5 -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container px-4 md:px-6 mx-auto">

        {/* Cabeçalho da Seção */}
        <div className="mb-16 md:text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            O Hub de Inteligência do seu ERP
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Centralizamos a expertise técnica da Trilink em ferramentas que transformam a maneira como sua equipe interage com o Syspro.
          </p>
        </div>

        {/* Grid Bento (Layout Moderno) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">

          {/* Card 1: Base de Conhecimento (Largo) */}
          <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 hover:border-white/20 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
              <BookText className="w-32 h-32 -mr-10 -mt-10 rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Documentação Viva</h3>
                <p className="text-muted-foreground max-w-md">
                  Não apenas manuais. Acesse guias interativos, referências de API e boas práticas validadas pelos nossos consultores sêniores.
                </p>
              </div>

              <div className="mt-8">
                <Link href="/docs" className="inline-flex items-center text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Acessar Biblioteca <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Suporte (Vertical) */}
          <div className="md:row-span-2 group rounded-3xl border border-white/10 bg-background/50 p-8 hover:border-primary/30 transition-all hover:bg-white/5">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Headset className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Suporte Trilink</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Conexão direta com quem entende do seu negócio. Abertura de chamados, rastreamento de SLA e suporte remoto especializado.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground/80 mb-8">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Atendimento Prioritário</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Consultoria Técnica</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Análise de Logs</li>
            </ul>
            <Button variant="outline" className="w-full border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30">
              Abrir Chamado
            </Button>
          </div>

          {/* Card 3: Ferramentas (Pequeno) */}
          <div className="rounded-3xl border border-white/10 bg-background/50 p-8 hover:border-orange-500/30 transition-all hover:bg-white/5 group">
            <div className="flex items-start justify-between mb-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Terminal className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Syspro Tools</h3>
            <p className="text-muted-foreground text-xs">
              Validadores XML, scripts SQL e utilitários de automação.
            </p>
          </div>

          {/* Card 4: Release Notes Dinâmico (Largo) */}
          <div className="md:col-span-2 rounded-3xl border border-white/10 bg-background/30 p-8 relative overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-purple-500/50 blur-[50px] rounded-full" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-none">Ciclo de Atualizações</h3>
                  <span className="text-xs text-muted-foreground">Evolução contínua do produto</span>
                </div>
              </div>
              <Link href={releaseLink} className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center">
                Ver Roadmap Completo <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {summaries.length > 0 ? (
                summaries.map((summary: any) => (
                  <Link
                    key={`${summary.year}-${summary.month}`}
                    href={`/docs/suporte/release/${summary.year}/${summary.month}`}
                    className="group block p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm mb-3 text-foreground/90">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {summary.monthName} <span className="text-xs opacity-50">/{summary.year}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400">
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Melhorias</span>
                        <span className="font-mono font-bold">{summary.melhorias}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
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

        </div>
      </div>
    </section>
  );
}