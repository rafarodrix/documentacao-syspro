import { Badge } from "@dosc-syspro/ui";

export type FeatureStatus = 'new' | 'deprecated' | 'beta' | 'experimental';
type FeatureBadgeTone = 'default' | 'soft';

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

const SOFT_CLASSNAMES: Record<FeatureStatus, string> = {
  new: 'border-emerald-500/25 text-emerald-200/80 bg-emerald-500/5',
  deprecated: 'border-rose-500/25 text-rose-200/80 bg-rose-500/5',
  beta: 'border-sky-500/25 text-sky-200/80 bg-sky-500/5',
  experimental: 'border-amber-500/25 text-amber-200/80 bg-amber-500/5',
};

export function DocsFeatureBadge({
  status,
  version,
  className,
  tone = 'default',
}: {
  status?: FeatureStatus;
  version?: string;
  className?: string;
  tone?: FeatureBadgeTone;
}) {
  if (!status) return null;

  return (
    <Badge
      variant="outline"
      className={`${tone === 'soft' ? SOFT_CLASSNAMES[status] : CLASSNAMES[status]} ${className ?? ''}`.trim()}
    >
      {LABELS[status]}{version ? ` ${version}` : ''}
    </Badge>
  );
}
