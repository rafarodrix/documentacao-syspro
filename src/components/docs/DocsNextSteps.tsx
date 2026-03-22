import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/DocsFeatureBadge';

type NextStepItem = {
  href: string;
  title: string;
  description?: string;
  featureStatus?: FeatureStatus;
  sinceVersion?: string;
};

export function DocsNextSteps({ items }: { items: NextStepItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10 rounded-lg border border-border/70 bg-card/40 p-4">
      <p className="text-sm font-semibold">Próximos passos</p>
      <p className="mt-1 text-xs text-muted-foreground">Continue a trilha com conteúdos relacionados.</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="line-clamp-1">{item.title}</p>
                <DocsFeatureBadge status={item.featureStatus} version={item.sinceVersion} className="text-[10px]" />
              </div>
              {item.description ? (
                <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
            <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}
