import {
  BookOpen,
  HelpCircle,
  Users,
  Wrench,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import type { RoleSegment } from './use-docs-dashboard';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type QuickLinkTone = 'docs' | 'faq' | 'training' | 'support' | 'technical';

export type QuickLink = {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tone: QuickLinkTone;
};

// ---------------------------------------------------------------------------
// Quick links base
// ---------------------------------------------------------------------------

export const BASE_QUICK_LINKS: QuickLink[] = [
  {
    href: '/docs/manual',
    title: 'Documentação',
    description: 'Guias e módulos para o dia a dia.',
    icon: BookOpen,
    tone: 'docs',
  },
  {
    href: '/docs/duvidas',
    title: 'Dúvidas frequentes',
    description: 'Respostas para incidentes comuns.',
    icon: HelpCircle,
    tone: 'faq',
  },
  {
    href: '/docs/treinamento',
    title: 'Treinamentos',
    description: 'Trilhas de capacitação da equipe.',
    icon: Users,
    tone: 'training',
  },
  {
    href: '/docs/suporte',
    title: 'Suporte',
    description: 'Processos, integrações e operação.',
    icon: Wrench,
    tone: 'support',
  },
];

export const TECHNICAL_QUICK_LINK: QuickLink = {
  href: '/docs/manuais-tecnicos',
  title: 'Manuais técnicos',
  description: 'Arquitetura, backlog e padrões.',
  icon: Wrench,
  tone: 'technical',
};

// ---------------------------------------------------------------------------
// Tarefas iniciais por role
// ---------------------------------------------------------------------------

export const ROLE_START_TASKS: Record<Role, Array<{ href: string; title: string; description: string }>> = {
  ADMIN: [
    { href: '/docs/manuais-tecnicos', title: 'Arquitetura e backlog', description: 'Governança técnica e padrões.' },
    { href: '/docs/suporte', title: 'Operação de suporte', description: 'Fluxos de atendimento e escalonamento.' },
    { href: '/docs/manual', title: 'Visão funcional do produto', description: 'Conteúdo orientado ao cliente final.' },
  ],
  DEVELOPER: [
    { href: '/docs/manuais-tecnicos', title: 'Manuais técnicos', description: 'Infra, stack e decisões de arquitetura.' },
    { href: '/docs/suporte', title: 'Processos de suporte', description: 'Contexto de operação e troubleshooting.' },
    { href: '/docs/duvidas', title: 'Erros recorrentes', description: 'Base para correções rápidas.' },
  ],
  SUPORTE: [
    { href: '/docs/suporte', title: 'Procedimentos de suporte', description: 'Playbooks e processos operacionais.' },
    { href: '/docs/duvidas', title: 'Dúvidas e erros comuns', description: 'Resolução rápida de incidentes.' },
    { href: '/docs/treinamento', title: 'Treinamentos', description: 'Capacitação contínua do time.' },
  ],
  CLIENTE_ADMIN: [
    { href: '/docs/manual', title: 'Operação do sistema', description: 'Rotinas principais do dia a dia.' },
    { href: '/docs/treinamento', title: 'Treinar equipe', description: 'Materiais para onboarding interno.' },
    { href: '/docs/duvidas', title: 'Resolver problemas comuns', description: 'Perguntas e respostas rápidas.' },
  ],
  CLIENTE_USER: [
    { href: '/docs/manual', title: 'Primeiros passos', description: 'Fluxo básico para começar a operar.' },
    { href: '/docs/duvidas', title: 'Erros mais comuns', description: 'Como resolver os principais bloqueios.' },
    { href: '/docs/treinamento', title: 'Aprender mais rápido', description: 'Guias práticos por módulo.' },
  ],
};

// ---------------------------------------------------------------------------
// Estilos por tone (MagicUI ShineBorder + pill)
// ---------------------------------------------------------------------------

export const TONE_STYLES: Record<QuickLinkTone, {
  shineColor: string[];
  pillClass: string;
  glowClass: string;
}> = {
  docs: {
    shineColor: ['#94a3b822', '#64748b18'],
    pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200',
    glowClass: 'from-slate-400/8',
  },
  faq: {
    shineColor: ['#94a3b822', '#47556918'],
    pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200',
    glowClass: 'from-slate-400/8',
  },
  training: {
    shineColor: ['#94a3b822', '#64748b18'],
    pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200',
    glowClass: 'from-slate-400/8',
  },
  support: {
    shineColor: ['#94a3b822', '#47556918'],
    pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200',
    glowClass: 'from-slate-400/8',
  },
  technical: {
    shineColor: ['#cbd5e122', '#64748b18'],
    pillClass: 'border-slate-300/20 bg-slate-400/5 text-slate-100',
    glowClass: 'from-slate-300/8',
  },
};

// ---------------------------------------------------------------------------
// Labels por role segment
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<RoleSegment, string> = {
  admin: 'Populares para admins',
  developer: 'Populares para developers',
  suporte: 'Populares no suporte',
  cliente_admin: 'Populares para cliente admin',
  cliente_user: 'Populares para clientes',
};
