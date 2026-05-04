'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MagicCard } from '@/components/magicui/magic-card';
import { ShineBorder } from '@/components/magicui/shine-border';
import type { QuickLink } from './docs-home-config';
import { TONE_STYLES } from './docs-home-config';

export function InsightLink({
  href,
  title,
  meta = <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />,
}: {
  href: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-12 items-center justify-between gap-3 rounded-xl border border-transparent bg-transparent px-4 py-3.5 text-sm no-underline transition-all hover:border-border/60 hover:bg-accent/70"
    >
      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="line-clamp-2 leading-snug">{title}</span>
      {meta}
    </Link>
  );
}

export function PremiumLinkCard({
  item,
  style,
  className,
  featured = false,
}: {
  item: QuickLink;
  style?: CSSProperties;
  className?: string;
  featured?: boolean;
}) {
  const Icon = item.icon;
  const tone = TONE_STYLES[item.tone];

  return (
    <Link
      href={item.href}
      className={cn('group block animate-docs-fade-up no-underline opacity-0', className)}
      style={style}
    >
      <MagicCard className="h-full rounded-3xl">
        <div
          className={cn(
            'relative h-full rounded-3xl border border-border/50 bg-background/35 p-4 backdrop-blur-xl transition-all group-hover:bg-background/55',
            featured && 'p-5 md:p-6',
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br to-transparent opacity-20',
              tone.glowClass,
            )}
          />
          <ShineBorder shineColor={tone.shineColor} duration={11} className="opacity-25" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/70',
                  featured && 'h-12 w-12 rounded-2xl',
                )}
              >
                <Icon className={cn('h-4.5 w-4.5 text-foreground/80', featured && 'h-5 w-5')} />
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
                <p className={cn('text-sm text-muted-foreground', featured && 'max-w-xl text-[15px] leading-7')}>
                  {item.description}
                </p>
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
        </div>
      </magic-card>
    </Link>
  );
}
