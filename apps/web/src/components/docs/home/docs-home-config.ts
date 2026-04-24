import {
  BookOpen,
  HelpCircle,
  Users,
  Wrench,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import type { RoleSegment } from './use-docs-dashboard';

export type QuickLinkTone = 'docs' | 'faq' | 'training' | 'support' | 'technical';

export type QuickLink = {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tone: QuickLinkTone;
};

export const BASE_QUICK_LINKS: QuickLink[] = [
  {
    href: '/portal/docs/manual',
    title: 'Documentacao',
    description: 'Guias e modulos para a operacao do dia a dia.',
    icon: BookOpen,
    tone: 'docs',
  },
  {
    href: '/portal/docs/duvidas',
    title: 'Duvidas frequentes',
    description: 'Respostas para incidentes e duvidas recorrentes.',
    icon: HelpCircle,
    tone: 'faq',
  },
  {
    href: '/portal/docs/treinamento',
    title: 'Treinamentos',
    description: 'Trilhas praticas para acelerar a capacitacao da equipe.',
    icon: Users,
    tone: 'training',
  },
  {
    href: '/portal/docs/suporte',
    title: 'Suporte',
    description: 'Processos, atendimento e operacao assistida.',
    icon: Wrench,
    tone: 'support',
  },
];

export const TECHNICAL_QUICK_LINK: QuickLink = {
  href: '/portal/docs/manuais-tecnicos',
  title: 'Manuais tecnicos',
  description: 'Arquitetura, integracoes e padroes tecnicos.',
  icon: Wrench,
  tone: 'technical',
};

export const ROLE_START_TASKS: Record<Role, Array<{ href: string; title: string; description: string }>> = {
  ADMIN: [
    { href: '/portal/docs/manuais-tecnicos', title: 'Arquitetura e backlog', description: 'Governanca tecnica e padroes da operacao.' },
    { href: '/portal/docs/suporte', title: 'Operacao de suporte', description: 'Fluxos de atendimento, triagem e escalonamento.' },
    { href: '/portal/docs/manual', title: 'Visao funcional do produto', description: 'Leitura funcional para entender modulos e rotinas.' },
  ],
  DEVELOPER: [
    { href: '/portal/docs/manuais-tecnicos', title: 'Manuais tecnicos', description: 'Infraestrutura, stack e decisoes de arquitetura.' },
    { href: '/portal/docs/suporte', title: 'Processos de suporte', description: 'Troubleshooting, contexto operacional e playbooks.' },
    { href: '/portal/docs/duvidas', title: 'Erros recorrentes', description: 'Referencias rapidas para correcoes mais comuns.' },
  ],
  SUPORTE: [
    { href: '/portal/docs/suporte', title: 'Procedimentos de suporte', description: 'Playbooks operacionais e padroes de atendimento.' },
    { href: '/portal/docs/duvidas', title: 'Duvidas e erros comuns', description: 'Base de resolucao rapida para incidentes frequentes.' },
    { href: '/portal/docs/treinamento', title: 'Treinamentos', description: 'Capacitacao continua para equipe de suporte.' },
  ],
  CLIENTE_ADMIN: [
    { href: '/portal/docs/manual', title: 'Operacao do sistema', description: 'Rotinas essenciais para administrar o ambiente.' },
    { href: '/portal/docs/treinamento', title: 'Treinar equipe', description: 'Materiais de onboarding e padronizacao interna.' },
    { href: '/portal/docs/duvidas', title: 'Resolver problemas comuns', description: 'Consultas rapidas para bloqueios operacionais.' },
  ],
  CLIENTE_USER: [
    { href: '/portal/docs/manual', title: 'Primeiros passos', description: 'Fluxo inicial para comecar a operar com seguranca.' },
    { href: '/portal/docs/duvidas', title: 'Erros mais comuns', description: 'Como resolver os principais bloqueios do dia a dia.' },
    { href: '/portal/docs/treinamento', title: 'Aprender mais rapido', description: 'Guias praticos por modulo e processo.' },
  ],
};

export const TONE_STYLES: Record<QuickLinkTone, {
  shineColor: string[];
  pillClass: string;
  glowClass: string;
}> = {
  docs: {
    shineColor: ['#3b82f633', '#60a5fa33'],
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

export const ROLE_LABELS: Record<RoleSegment, string> = {
  admin: 'Populares para admins',
  developer: 'Populares para developers',
  suporte: 'Populares no suporte',
  cliente_admin: 'Populares para cliente admin',
  cliente_user: 'Populares para clientes',
};
