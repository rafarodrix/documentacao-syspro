import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
      className="group rounded-lg border border-border/70 bg-card/40 p-3 transition-colors hover:bg-accent"
    >
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {isPrev ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        <span>{isPrev ? 'Anterior' : 'Proximo'}</span>
      </div>
      <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
      {item.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
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
    <section className="mt-10">
      <p className="mb-3 text-sm font-semibold">Continuar navegacao</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {previous ? <NavCard item={previous} direction="prev" /> : <div />}
        {next ? <NavCard item={next} direction="next" /> : <div />}
      </div>
    </section>
  );
}
