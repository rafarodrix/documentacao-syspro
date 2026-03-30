'use client';

import type { ReactNode, CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MagicCard } from '@/components/magicui/magic-card';
import { ShineBorder } from '@/components/magicui/shine-border';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import type { QuickLink } from './docs-home-config';
import { TONE_STYLES } from './docs-home-config';

// ---------------------------------------------------------------------------
// HeroMetric — agora com NumberTicker para animação de contagem
// ---------------------------------------------------------------------------

export function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-border hover:bg-background/75">
      <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-300/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">
        <NumberTicker value={value} />
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CountBadge
// ---------------------------------------------------------------------------

export function CountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="ml-2 shrink-0 rounded-md border border-border/60 bg-card tabular-nums"
    >
      {count}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// InsightLink
// ---------------------------------------------------------------------------

export function InsightLink({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 text-sm transition-all hover:border-primary/35 hover:bg-accent/60"
    >
      <span className="absolute inset-y-1 left-1 w-0.5 rounded bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="line-clamp-2 leading-snug">{title}</span>
      {meta ?? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// InsightCard — com Skeleton quando está carregando
// ---------------------------------------------------------------------------

export function InsightCard({
  children,
  className,
  loading = false,
  icon,
  label,
}: {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  icon?: React.ElementType;
  label: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.55)]',
        className,
      )}
    >
      <ShineBorder shineColor={['#cbd5e10d', '#64748b0a']} duration={15} className="opacity-15" />
      <div className="relative z-10">
        {icon ? <DocsSectionHeader icon={icon} label={label} /> : null}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-4/5 rounded-lg" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PremiumLinkCard — quick access cards com MagicUI
// ---------------------------------------------------------------------------

export function PremiumLinkCard({
  item,
  style,
}: {
  item: QuickLink;
  style?: CSSProperties;
}) {
  const Icon = item.icon;
  const tone = TONE_STYLES[item.tone];

  return (
    <Link href={item.href} className="group block animate-docs-fade-up opacity-0" style={style}>
      <MagicCard className="h-full rounded-2xl">
        <div className="relative h-full rounded-2xl border border-border/70 bg-card/70 p-4 transition-colors sm:p-5 group-hover:bg-card">
          <div
            className={cn(
              'pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br to-transparent opacity-20',
              tone.glowClass,
            )}
          />
          <ShineBorder shineColor={tone.shineColor} duration={11} className="opacity-30" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/70">
                <Icon className="h-4.5 w-4.5 text-foreground/80" />
              </div>
              <div className="space-y-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]',
                    tone.pillClass,
                  )}
                >
                  {item.title}
                </span>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
        </div>
      </MagicCard>
    </Link>
  );
}
