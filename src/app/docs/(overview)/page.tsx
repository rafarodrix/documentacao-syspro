// --- Imports  ---
import Link from 'next/link';
import { BookOpen, HelpCircle, GraduationCap, Rocket, MessagesSquare, Phone, Mail, Wrench, Sparkles, Bug, Calendar } from 'lucide-react';
import { getReleases } from '@/src/lib/releases'; 
import { formatRecency } from '@/src/lib/date';
import { groupReleasesByMonth, type MonthSummary } from '@/src/lib/releases-helpers';
import type { Release } from '@/src/lib/types'; 

// --- Dados para os cards de navegação ---
const navLinks = [
  {
    title: 'Documentação Completa',
    description: 'Navegue por todos os módulos e funcionalidades.',
    href: '/docs/manual',
    icon: <BookOpen className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
  {
    title: 'Dúvidas Frequentes',
    description: 'Respostas rápidas para as perguntas mais comuns.',
    href: '/docs/duvidas',
    icon: <HelpCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
  {
    title: 'Guias e Tutoriais',
    description: 'Aprenda tarefas com nossos guias práticos.',
    href: '/docs/treinamento',
    icon: <GraduationCap className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
  {
    title: 'Central de Suporte',
    description:   "Precisa de ajuda? Contate nossa equipe especializada.",
    href: '/docs/suporte',
    icon: <Wrench className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
];

// Revalidação da página para buscar novos releases periodicamente
export const revalidate = 3600; // 1 hora

// --- Componente da Página ---
export default async function HomePage() {
  const allReleases: Release[] = await getReleases();
  const monthlySummaries = groupReleasesByMonth(allReleases);
  const latestMonthsSnippet = monthlySummaries.slice(0, 3);
  const latestUpdateText = allReleases.length > 0 ? formatRecency(allReleases[0].isoDate) : "Nenhuma atualização recente";

  return (
    <main className="flex-1 flex flex-col items-center p-6 md:p-12 text-center">
      
      {/* Seção do Título */}
      <section className="max-w-3xl mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Central de Ajuda Syspro ERP
        </h1>
        <p className="text-lg text-muted-foreground">
          Encontre tudo sobre o Syspro ERP: Documentação, Tutoriais, FAQs e Suporte.
        </p>
      </section>

      {/* Seção de Navegação Principal */}
      <section className="w-full max-w-5xl mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {navLinks.map((link) => (
            <Link key={link.title} href={link.href} className="no-underline group block h-full">
              <div className="h-full p-5 text-center flex flex-col items-center justify-center border bg-card rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-primary">
                {link.icon}
                <h3 className='font-semibold mt-4 mb-1 text-foreground'>{link.title}</h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Seção Dinâmica de Novidades de Versão */}
      <section className="w-full max-w-5xl mb-20">
        <div className="border rounded-xl p-6 md:p-8 bg-gradient-to-tr from-card to-secondary/30 flex flex-col items-start gap-6">
          <div className="text-left flex-grow w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
                        {latestUpdateText}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-foreground">
                        Sempre Evoluindo para Você
                    </h2>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                    <Link href="/docs/suporte/releasenotes" className="no-underline">
                        <button className="group w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-md hover:bg-primary/90 transition-all duration-200 ease-in-out shadow-md hover:scale-105 hover:shadow-lg">
                            <Rocket className="w-5 h-5 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
                            Ver Todas as Atualizações
                        </button>
                    </Link>
                </div>
            </div>
            
            <p className="text-muted-foreground text-sm max-w-2xl mt-2">
              Confira um resumo das implementações e correções dos últimos meses.
            </p>

            {latestMonthsSnippet.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                    {latestMonthsSnippet.map((summary, index) => (
                        <Link 
                            key={`${summary.year}-${summary.month}`}
                            href={`/docs/suporte/release/${summary.year}/${summary.month}`}
                            className="no-underline group block"
                        >
                            <div className="h-full p-4 border bg-background/50 rounded-lg transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-1 hover:border-primary">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        {summary.monthName}
                                    </p>
                                    {index === 0 && (
                                        <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                                            Mais Recente
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-left text-muted-foreground mb-3">{summary.year}</p>

                                <div className="border-t pt-3 space-y-2 text-sm">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-green-500" /> Melhorias</span>
                                        <span className="font-medium text-foreground">{summary.melhorias}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Bug className="w-4 h-4 text-amber-500" /> Bugs Corrigidos</span>
                                        <span className="font-medium text-foreground">{summary.bugs}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
          </div>
        </div>
      </section>

      {/* Seção "Precisa de Ajuda?" */}
      <section className="w-full max-w-5xl border-t pt-16">
        <h2 className="text-3xl font-bold mb-4">Precisa de Ajuda?</h2>
        <p className="text-muted-foreground mb-8">
          Se não encontrou o que procurava, nossa equipe de suporte está pronta para ajudar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <a href="https://wa.me/5534997713731" target="_blank" rel="noopener noreferrer" className="no-underline group block h-full"><div className="border bg-card rounded-lg p-4 h-full transition-colors group-hover:border-primary"><div className="flex items-center gap-3 mb-2"><MessagesSquare className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /><h3 className="font-semibold text-foreground">WhatsApp</h3></div><p className="text-sm text-muted-foreground mb-2">Ideal para dúvidas rápidas e suporte ágil.</p><p className="text-sm font-medium text-foreground">(34) 99771-3731</p></div></a>
            <a href="tel:+5534997713731" className="no-underline group block h-full"><div className="border bg-card rounded-lg p-4 h-full transition-colors group-hover:border-primary"><div className="flex items-center gap-3 mb-2"><Phone className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /><h3 className="font-semibold text-foreground">Telefone</h3></div><p className="text-sm text-muted-foreground mb-2">Para emergências e suporte por voz.</p><p className="text-sm font-medium text-foreground">(34) 99771-3731</p></div></a>
            <a href="mailto:equipe@trilinksoftware.com.br" className="no-underline group block h-full"><div className="border bg-card rounded-lg p-4 h-full transition-colors group-hover:border-primary"><div className="flex items-center gap-3 mb-2"><Mail className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /><h3 className="font-semibold text-foreground">E-mail</h3></div><p className="text-sm text-muted-foreground mb-2">Para solicitações detalhadas.</p><p className="text-sm font-medium text-foreground break-all">equipe@trilinksoftware.com.br</p></div></a>
        </div>
      </section>
    </main>
  );
}