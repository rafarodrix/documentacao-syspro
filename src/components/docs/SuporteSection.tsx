'use client';

import React from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Headphones,
  ArrowUpRight,
  Shield,
  Zap,
} from 'lucide-react';

interface SuporteSectionProps {
  modulo?: string;
}

const SuporteSection: React.FC<SuporteSectionProps> = ({
  modulo = 'este módulo',
}) => {
  return (
    <section className="mt-20 relative">

      {/* Linha divisória com label enterprise */}
      <div className="flex items-center gap-4 mb-12">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" />
          Suporte Técnico
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Hero da seção */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Central de Atendimento — Trilink Software
            </p>
            <h2 className="text-4xl font-bold tracking-tight leading-tight text-foreground">
              Suporte especializado
              <br />
              <span className="text-muted-foreground font-normal">
                para {modulo}
              </span>
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Contamos com uma equipe técnica dedicada para garantir a
              continuidade e a estabilidade da sua operação. Cada chamado
              é tratado com prioridade definida por nível de impacto.
            </p>
          </div>

          {/* Indicador de status operacional */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Sistemas Operacionais
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Última verificação: hoje
            </p>
          </div>
        </div>
      </div>

      {/* SLA Cards — dois painéis lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden mb-8 border border-border">

        {/* Horário Comercial */}
        <div className="bg-card p-8 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Atendimento Padrão
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-0.5">
                  Horário Comercial
                </h3>
              </div>
            </div>
            <span className="hidden md:inline-flex items-center text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
              Nível 1 e 2
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-foreground">
              Segunda a Sexta, 08h às 18h
            </span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Atendimento completo para dúvidas operacionais, ajustes de
            configuração, treinamentos e suporte técnico de primeiro e
            segundo nível via WhatsApp, telefone e e-mail.
          </p>

          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SLA de resposta: até 4h úteis
            </div>
          </div>
        </div>

        {/* Plantão Emergencial */}
        <div className="bg-card p-8 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Atendimento Crítico
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-0.5">
                  Plantão Emergencial
                </h3>
              </div>
            </div>
            <span className="hidden md:inline-flex items-center text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full">
              Nível Crítico
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-foreground">
              Fora do horário comercial
            </span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Acionamento exclusivo para <strong className="text-foreground">parada total do sistema</strong> ou
            falhas críticas que impeçam completamente a operação. Disponível
            apenas via telefone — chamadas com prioridade imediata.
          </p>

          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SLA de resposta: até 30 minutos
            </div>
          </div>
        </div>
      </div>

      {/* Canais de Contato — tabela-style horizontal enterprise */}
      <div className="rounded-xl border border-border overflow-hidden mb-8">

        {/* Header da tabela */}
        <div className="bg-muted/50 px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Canais de Atendimento
          </h3>
        </div>

        {/* Canal: WhatsApp */}
        <a
          href="https://wa.me/5534997713731"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between px-6 py-5 bg-card hover:bg-muted/30 border-b border-border transition-colors duration-200"
        >
          <div className="flex items-center gap-5">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                +55 (34) 99771-3731 · Dúvidas do dia a dia e chamados rotineiros
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
              Horário comercial
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </div>
        </a>

        {/* Canal: Telefone */}
        <a
          href="tel:+5534997713731"
          className="group flex items-center justify-between px-6 py-5 bg-card hover:bg-muted/30 border-b border-border transition-colors duration-200"
        >
          <div className="flex items-center gap-5">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Telefone</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                +55 (34) 99771-3731 · Canal exclusivo para o plantão de emergência
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              Plantão 24h
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </div>
        </a>

        {/* Canal: E-mail */}
        <a
          href="mailto:equipe@trilinksoftware.com.br"
          className="group flex items-center justify-between px-6 py-5 bg-card hover:bg-muted/30 transition-colors duration-200"
        >
          <div className="flex items-center gap-5">
            <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0">
              <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">E-mail</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                equipe@trilinksoftware.com.br · Solicitações formais e envio de logs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
              Horário comercial
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </div>
        </a>
      </div>

      {/* Disclaimer enterprise — faixa sóbria */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground font-medium">Atenção:</strong>{' '}
          WhatsApp e E-mail não são monitorados fora do horário comercial.
          Para situações de emergência após às 18h ou nos finais de semana,
          utilize <strong className="text-foreground font-medium">exclusivamente o telefone</strong>.
        </p>
      </div>

    </section>
  );
};

export default SuporteSection;