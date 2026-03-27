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
import { DocsPageFeedback } from '@/components/docs/DocsPageFeedback';

interface SuporteSectionProps {
  modulo?: string;
  moduleDescription?: string;
  feedback?: {
    slug: string;
    title: string;
  };
}

const SuporteSection: React.FC<SuporteSectionProps> = ({
  modulo = 'este módulo',
  moduleDescription,
  feedback,
}) => {
  return (
    <section className="relative mt-20">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" />
          Central de Atendimento — Trilink Software
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      {feedback ? <DocsPageFeedback slug={feedback.slug} title={feedback.title} variant="inline" /> : null}

      <div className="mb-12 mt-8 max-w-3xl space-y-3">
        <h2 className="text-4xl font-bold leading-tight tracking-tight text-foreground">
          Suporte especializado
          <br />
          <span className="font-normal text-muted-foreground">para {modulo}</span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Contamos com uma equipe técnica dedicada para garantir a continuidade e a estabilidade da sua operação.
          Cada chamado é tratado com prioridade definida por nível de impacto.
        </p>
        {moduleDescription ? (
          <p className="max-w-2xl rounded-lg border border-border/45 bg-background/35 px-4 py-3 text-sm text-muted-foreground/90">
            <span className="font-medium text-foreground">{modulo}</span>
            {': '}
            {moduleDescription}
          </p>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
        <div className="flex flex-col gap-4 bg-card p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Atendimento Padrão</p>
                <h3 className="mt-0.5 text-lg font-semibold text-foreground">Horário Comercial</h3>
              </div>
            </div>
            <span className="hidden items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 md:inline-flex">
              Nível 1 e 2
            </span>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <strong className="text-foreground">Segunda a sexta:</strong> 8h às 18h
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span>Atendimento completo para dúvidas operacionais, ajustes de configuração e treinamentos.</span>
            </li>
          </ul>

          <div className="mt-auto border-t border-border/60 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SLA de resposta: até 4h úteis
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-card p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Atendimento Crítico</p>
                <h3 className="mt-0.5 text-lg font-semibold text-foreground">Horário de Plantão</h3>
              </div>
            </div>
            <span className="hidden items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 md:inline-flex">
              Nível Crítico
            </span>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <strong className="text-foreground">Segunda a sexta:</strong> 18h às 21h
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <strong className="text-foreground">Sábados, domingos e feriados:</strong> 8h às 20h
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span>Suporte exclusivo para emergências que impactam diretamente sua operação.</span>
            </li>
          </ul>

          <div className="mt-auto border-t border-border/60 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SLA de resposta: até 30 minutos
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-5 flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Canais de Atendimento</h3>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <a
            href="https://wa.me/5534997713731"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 no-underline transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/5"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">WhatsApp</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Dúvidas do dia a dia e chamados rotineiros durante o horário comercial.</p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-medium text-muted-foreground">+55 (34) 99771-3731</p>
              <span className="mt-1.5 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Horário comercial</span>
            </div>
          </a>

          <a
            href="tel:+5534997713731"
            className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 no-underline transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-500/5"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-500" />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">Telefone</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Canal para dúvidas do dia a dia e chamados rotineiros durante o horário comercial e emergências fora do horário comercial, durante o plantão.</p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-medium text-muted-foreground">+55 (34) 99771-3731</p>
              <span className="mt-1.5 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Horário comercial</span>
              <span className="mt-1.5 inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Plantão</span>
            </div>
          </a>

          <a
            href="mailto:equipe@trilinksoftware.com.br"
            className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 no-underline transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-500/5"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-500" />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">E-mail</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Solicitações formais, envio de logs e registros de chamados por escrito.</p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-medium text-muted-foreground">equipe@trilinksoftware.com.br</p>
              <span className="mt-1.5 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Horário comercial</span>
            </div>
          </a>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="leading-relaxed">
          <strong className="font-medium text-foreground">Atenção:</strong>{' '}
          WhatsApp e E-mail não são monitorados fora do horário comercial.
          Para situações de emergência, utilize o <strong className="font-medium text-foreground">telefone</strong>{' '}
          dentro dos horários de plantão disponíveis.
        </p>
      </div>
    </section>
  );
};

export default SuporteSection;
