import { Badge } from '@/components/ui/badge';

export type FeatureStatus = 'new' | 'deprecated' | 'beta' | 'experimental';

const LABELS: Record<FeatureStatus, string> = {
  new: 'Novo',
  deprecated: 'Deprecated',
  beta: 'Beta',
  experimental: 'Experimental',
};

const CLASSNAMES: Record<FeatureStatus, string> = {
  new: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  deprecated: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
  beta: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
  experimental: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
};

export function DocsFeatureBadge({
  status,
  version,
  className,
}: {
  status?: FeatureStatus;
  version?: string;
  className?: string;
}) {
  if (!status) return null;

  return (
    <Badge variant="outline" className={`${CLASSNAMES[status]} ${className ?? ''}`.trim()}>
      {LABELS[status]}{version ? ` ${version}` : ''}
    </Badge>
  );
}
