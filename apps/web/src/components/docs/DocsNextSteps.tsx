import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/DocsFeatureBadge';
import { DocsSurface } from '@/components/docs/DocsSurface';

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
    <DocsSurface className="mt-8 border-border/35 bg-background/25 p-2.5 shadow-sm md:p-3" hoverable>
      <p className="text-sm font-semibold tracking-tight">Proximos passos</p>
      <p className="mt-1 text-xs text-muted-foreground/85">Continue a trilha com conteudos relacionados.</p>
      <div className="mt-2 divide-y divide-border/50">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start justify-between gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors hover:bg-accent/35"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="line-clamp-1 font-medium">{item.title}</p>
                <DocsFeatureBadge
                  status={item.featureStatus}
                  version={item.sinceVersion}
                  tone="soft"
                  className="h-4 px-1.5 text-[9px] leading-none"
                />
              </div>
              {item.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/85">{item.description}</p>
              ) : null}
            </div>
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/45 bg-background/60 text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:text-foreground">
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </DocsSurface>
  );
}
