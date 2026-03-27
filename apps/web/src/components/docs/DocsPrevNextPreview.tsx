import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DocsSurface } from '@/components/docs/DocsSurface';

type NavItem = {
  href: string;
  title: string;
  description?: string;
};

function NavCard({
  item,
  direction,
}: {
  item: NavItem;
  direction: 'prev' | 'next';
}) {
  const isPrev = direction === 'prev';
  return (
    <Link
      href={item.href}
      className="group rounded-lg border border-border/55 bg-background/45 p-3 transition-colors hover:bg-accent/45"
    >
      <div className="mb-1.5 flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground">
        <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2">
          {isPrev ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
          <span>{isPrev ? 'Anterior' : 'Proximo'}</span>
        </span>
      </div>
      <p className="line-clamp-1 text-sm font-medium tracking-tight">{item.title}</p>
      {item.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/95">{item.description}</p>
      ) : null}
    </Link>
  );
}

export function DocsPrevNextPreview({
  previous,
  next,
}: {
  previous?: NavItem;
  next?: NavItem;
}) {
  if (!previous && !next) return null;

  return (
    <section className="mt-8">
      <p className="mb-2.5 text-sm font-semibold tracking-tight">Continuar navegacao</p>
      <DocsSurface className="border-border/45 bg-background/35 p-2 shadow-sm md:p-3" hoverable>
        <div className="grid gap-2 sm:grid-cols-2">
          {previous ? <NavCard item={previous} direction="prev" /> : <div />}
          {next ? <NavCard item={next} direction="next" /> : <div />}
        </div>
      </DocsSurface>
    </section>
  );
}
