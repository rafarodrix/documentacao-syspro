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
// Estilos por tone (Cores semânticas Tailwind para suportar Dark/Light mode)
// ---------------------------------------------------------------------------

export const TONE_STYLES: Record<QuickLinkTone, {
  shineColor: string[];
  pillClass: string;
  glowClass: string;
}> = {
  docs: {
    shineColor: ['#3b82f633', '#60a5fa33'], // Tons de primary genéricos para o shine
    pillClass: 'border-primary/20 bg-primary/10 text-primary',
    glowClass: 'from-primary/10',
  },
  faq: {
    shineColor: ['#10b98133', '#34d39933'],
    pillClass: 'border-secondary/20 bg-secondary/10 text-secondary-foreground',
    glowClass: 'from-secondary/10',
  },
  training: {
    shineColor: ['#8b5cf633', '#a78bfa33'],
    pillClass: 'border-accent/20 bg-accent/20 text-accent-foreground',
    glowClass: 'from-accent/10',
  },
  support: {
    shineColor: ['#f59e0b33', '#fbbf2433'],
    pillClass: 'border-muted-foreground/20 bg-muted text-muted-foreground',
    glowClass: 'from-muted-foreground/10',
  },
  technical: {
    shineColor: ['#64748b33', '#94a3b833'],
    pillClass: 'border-foreground/10 bg-foreground/5 text-foreground',
    glowClass: 'from-foreground/5',
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