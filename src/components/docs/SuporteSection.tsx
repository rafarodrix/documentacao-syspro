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

      {/* Linha divisória com label */}
      <div className="flex items-center gap-4 mb-12">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" />
          Suporte Técnico
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Hero da seção */}
      <div className="mb-12 space-y-3 max-w-2xl">
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

      {/* SLA Cards — dois painéis lado a lado, sem ícones inline nos títulos */}
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

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Segunda a sexta:</strong> 8h às 18h</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span>Atendimento completo para dúvidas operacionais, ajustes de configuração e treinamentos.</span>
            </li>
          </ul>

          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SLA de resposta: até 4h úteis
            </div>
          </div>
        </div>

        {/* Plantão Emergencial — corrigido: não é 24h */}
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
                  Horário de Plantão
                </h3>
              </div>
            </div>
            <span className="hidden md:inline-flex items-center text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full">
              Nível Crítico
            </span>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Segunda a sexta:</strong> 18h às 21h</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Sábados, domingos e feriados:</strong> 8h às 20h</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span>Suporte exclusivo para emergências que impactam diretamente sua operação.</span>
            </li>
          </ul>

          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SLA de resposta: até 30 minutos
            </div>
          </div>
        </div>
      </div>

      {/* Canais de Contato — três cards compactos lado a lado */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Canais de Atendimento
          </h3>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Card WhatsApp */}
          <a
            href="https://wa.me/5534997713731"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">WhatsApp</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dúvidas do dia a dia e chamados rotineiros durante o horário comercial.
              </p>
            </div>
            <div className="pt-3 border-t border-border/60">
              <p className="text-xs font-medium text-muted-foreground">
                +55 (34) 99771-3731
              </p>
              <span className="inline-flex mt-1.5 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                Horário comercial
              </span>
            </div>
          </a>

          {/* Card Telefone */}
          <a
            href="tel:+5534997713731"
            className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Telefone</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Canal para emergências fora do horário comercial, durante o plantão.
              </p>
            </div>
            <div className="pt-3 border-t border-border/60">
              <p className="text-xs font-medium text-muted-foreground">
                +55 (34) 99771-3731
              </p>
              <span className="inline-flex mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Plantão
              </span>
            </div>
          </a>

          {/* Card E-mail */}
          <a
            href="mailto:equipe@trilinksoftware.com.br"
            className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">E-mail</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Solicitações formais, envio de logs e registros de chamados por escrito.
              </p>
            </div>
            <div className="pt-3 border-t border-border/60">
              <p className="text-xs font-medium text-muted-foreground">
                equipe@trilinksoftware.com.br
              </p>
              <span className="inline-flex mt-1.5 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                Horário comercial
              </span>
            </div>
          </a>

        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground font-medium">Atenção:</strong>{' '}
          WhatsApp e E-mail não são monitorados fora do horário comercial.
          Para situações de emergência, utilize o{' '}
          <strong className="text-foreground font-medium">telefone</strong>{' '}
          dentro dos horários de plantão disponíveis.
        </p>
      </div>

    </section>
  );
};

export default SuporteSection;