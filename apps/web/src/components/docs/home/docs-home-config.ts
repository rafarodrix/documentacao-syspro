import {
  BookOpen,
  HelpCircle,
  Users,
  Wrench,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import type { AudienceSegment } from './use-docs-dashboard';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';

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
    href: `${DOCS_SCOPE_ROUTES.cliente}/documentacao`,
    title: 'Documentacao',
    description: 'Guias e modulos para a operacao do dia a dia.',
    icon: BookOpen,
    tone: 'docs',
  },
  {
    href: `${DOCS_SCOPE_ROUTES.cliente}/duvidas`,
    title: 'Duvidas frequentes',
    description: 'Respostas para incidentes e duvidas recorrentes.',
    icon: HelpCircle,
    tone: 'faq',
  },
  {
    href: `${DOCS_SCOPE_ROUTES.cliente}/treinamentos`,
    title: 'Treinamentos',
    description: 'Trilhas praticas para acelerar a capacitacao da equipe.',
    icon: Users,
    tone: 'training',
  },
  {
    href: `${DOCS_SCOPE_ROUTES.cliente}/suporte`,
    title: 'Suporte',
    description: 'Processos, atendimento e operacao assistida.',
    icon: Wrench,
    tone: 'support',
  },
];

export const TECHNICAL_QUICK_LINK: QuickLink = {
  href: DOCS_SCOPE_ROUTES.admin,
  title: 'Admin',
  description: 'Infraestrutura, operacao interna e documentacao administrativa.',
  icon: Wrench,
  tone: 'technical',
};

export const ROLE_START_TASKS: Record<Role, Array<{ href: string; title: string; description: string }>> = {
  ADMIN: [
    { href: DOCS_SCOPE_ROUTES.admin, title: 'Infraestrutura e operacao', description: 'Governanca tecnica e padroes da operacao.' },
    { href: DOCS_SCOPE_ROUTES.suporte, title: 'Operacao de suporte', description: 'Fluxos de atendimento, triagem e escalonamento.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/documentacao`, title: 'Visao funcional do produto', description: 'Leitura funcional para entender modulos e rotinas.' },
  ],
  DEVELOPER: [
    { href: DOCS_SCOPE_ROUTES.suporte, title: 'Processos de suporte', description: 'Troubleshooting, contexto operacional e playbooks.' },
    { href: DOCS_SCOPE_ROUTES.admin, title: 'Infraestrutura e stack', description: 'Infraestrutura, stack e decisoes de arquitetura.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/duvidas`, title: 'Erros recorrentes', description: 'Referencias rapidas para correcoes mais comuns.' },
  ],
  SUPORTE: [
    { href: DOCS_SCOPE_ROUTES.suporte, title: 'Procedimentos de suporte', description: 'Playbooks operacionais e padroes de atendimento.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/duvidas`, title: 'Duvidas e erros comuns', description: 'Base de resolucao rapida para incidentes frequentes.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/treinamentos`, title: 'Treinamentos', description: 'Capacitacao continua para equipe de suporte.' },
  ],
  CLIENTE_ADMIN: [
    { href: `${DOCS_SCOPE_ROUTES.cliente}/documentacao`, title: 'Operacao do sistema', description: 'Rotinas essenciais para administrar o ambiente.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/treinamentos`, title: 'Treinar equipe', description: 'Materiais de onboarding e padronizacao interna.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/duvidas`, title: 'Resolver problemas comuns', description: 'Consultas rapidas para bloqueios operacionais.' },
  ],
  CLIENTE_USER: [
    { href: `${DOCS_SCOPE_ROUTES.cliente}/documentacao`, title: 'Primeiros passos', description: 'Fluxo inicial para comecar a operar com seguranca.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/duvidas`, title: 'Erros mais comuns', description: 'Como resolver os principais bloqueios do dia a dia.' },
    { href: `${DOCS_SCOPE_ROUTES.cliente}/treinamentos`, title: 'Aprender mais rapido', description: 'Guias praticos por modulo e processo.' },
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

export const AUDIENCE_LABELS: Record<AudienceSegment, string> = {
  internal_admin: 'Populares para administracao interna',
  internal_development: 'Populares para desenvolvimento',
  internal_support: 'Populares para suporte',
  client_manager: 'Populares para gestores clientes',
  client_user: 'Populares para clientes',
};
