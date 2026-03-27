import Link from 'next/link';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/DocsFeatureBadge';

type SectionLinkItem = {
  href: string;
  title: string;
  description?: string;
  featureStatus?: FeatureStatus;
  sinceVersion?: string;
};

export function DocsSectionLinks({
  title = 'Conteudos desta secao',
  description = 'Navegue pelos principais documentos relacionados.',
  items,
}: {
  title?: string;
  description?: string;
  items: SectionLinkItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border/70 bg-card/40 p-4">
      <div className="mb-3 flex items-start gap-2">
        <FolderOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-md border border-border/70 bg-background px-3 py-2 transition-all duration-150 hover:border-primary/30 hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                  <DocsFeatureBadge status={item.featureStatus} version={item.sinceVersion} className="text-[10px]" />
                </div>
                {item.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-70 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
