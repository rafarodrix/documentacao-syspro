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
// HeroMetric — transformado em Link (Actionable)
// ---------------------------------------------------------------------------

export function HeroMetric({
  icon: Icon,
  label,
  value,
  href,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-border hover:bg-background/90",
        className
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground transition-colors group-hover:text-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">
        <NumberTicker value={value} />
      </p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// CountBadge
// ---------------------------------------------------------------------------

export function CountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="ml-2 shrink-0 rounded-md border-transparent bg-muted tabular-nums text-muted-foreground"
    >
      {count}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// InsightLink — Aumento de touch target (py-3) e sem bordas excessivas
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
      className="group relative flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-transparent bg-transparent px-4 py-3.5 text-sm transition-all hover:bg-accent/70 hover:border-border/60"
    >
      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="line-clamp-2 leading-snug">{title}</span>
      {meta ?? (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// InsightCard
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
        'relative h-full overflow-hidden rounded-3xl border border-border/50 bg-background/40 backdrop-blur-xl p-5 shadow-lg transition-all hover:shadow-xl',
        className,
      )}
    >
      <ShineBorder shineColor={['#cbd5e10d', '#64748b0a']} duration={15} className="opacity-15" />
      <div className="relative z-10">
        {icon ? <DocsSectionHeader icon={icon} label={label} /> : null}
        {loading ? (
          <div className="space-y-2 mt-2">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-4/5 rounded-lg" />
          </div>
        ) : (
          <div className="mt-2">{children}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PremiumLinkCard
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
      <MagicCard className="h-full rounded-3xl">
        <div className="relative h-full rounded-3xl border border-border/50 bg-background/30 backdrop-blur-2xl p-5 sm:p-6 transition-all group-hover:bg-background/50">
          <div
            className={cn(
              'pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br to-transparent opacity-20',
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
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium',
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