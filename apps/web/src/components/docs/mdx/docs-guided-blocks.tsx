import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Gavel,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocsTone = 'blue' | 'green' | 'amber' | 'slate' | 'red';

const toneClasses: Record<DocsTone, string> = {
  blue: 'border-sky-300/70 bg-sky-50/90 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100',
  green: 'border-emerald-300/70 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
  amber: 'border-amber-300/70 bg-amber-50/90 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  slate: 'border-border bg-muted/50 text-foreground',
  red: 'border-rose-300/70 bg-rose-50/90 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
};

function toneBadgeClasses(tone: DocsTone) {
  return toneClasses[tone];
}

function NoticeFrame({
  icon,
  title,
  children,
  tone,
  className,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone: DocsTone;
  className: string;
}) {
  return (
    <div
      data-docs-guided-block="notice"
      data-docs-tone={tone}
      className={cn('docs-guided-card docs-guided-notice my-6 rounded-lg border px-4 py-3', className)}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="shrink-0">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-sm leading-6">{children}</div>
    </div>
  );
}

export function CodeBadge({
  code,
  label,
  tone = 'slate',
}: {
  code: string;
  label?: string;
  tone?: DocsTone;
}) {
  return (
    <span
      data-docs-guided-block="badge"
      data-docs-tone={tone}
      className={cn(
        'docs-code-badge inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-medium',
        toneBadgeClasses(tone),
      )}
    >
      <span>{code}</span>
      {label ? <span className="text-xs font-normal opacity-80">{label}</span> : null}
    </span>
  );
}

export function GuidanceNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <NoticeFrame
      icon={<FileCheck2 className="h-4 w-4" />}
      title={title}
      tone="blue"
      className={toneBadgeClasses('blue')}
    >
      {children}
    </NoticeFrame>
  );
}

export function RiskNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <NoticeFrame
      icon={<ShieldAlert className="h-4 w-4" />}
      title={title}
      tone="amber"
      className={toneBadgeClasses('amber')}
    >
      {children}
    </NoticeFrame>
  );
}

export function ReferenceCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-docs-guided-block="reference"
      className="docs-guided-card docs-reference-card mb-3 block rounded-lg border border-border bg-card/40 p-4 no-underline transition-colors hover:border-border/80 hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gavel className="h-4 w-4 text-primary" />
            <span>{title}</span>
          </div>
          <div className="mt-2 text-sm leading-6 text-foreground/80">{children}</div>
        </div>
        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </a>
  );
}

export function ChecklistPanel({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div data-docs-guided-block="checklist" className="docs-guided-card docs-checklist-panel my-6 rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>{title}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6 text-foreground/85">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComparisonTable({
  rows,
}: {
  rows: Array<{
    situation: string;
    owner: string;
    taxMoment: string;
    probableTreatment: string;
    validation: string;
    risk: 'low' | 'medium' | 'high';
  }>;
}) {
  const riskTone: Record<'low' | 'medium' | 'high', DocsTone> = {
    low: 'green',
    medium: 'amber',
    high: 'red',
  };

  return (
    <div data-docs-guided-block="comparison-table" className="docs-guided-table my-6 overflow-x-auto rounded-lg border border-border bg-card/40">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-muted/50 text-left text-foreground/80">
          <tr>
            <th className="px-4 py-3 font-medium">Situacao</th>
            <th className="px-4 py-3 font-medium">Titularidade</th>
            <th className="px-4 py-3 font-medium">Momento fiscal</th>
            <th className="px-4 py-3 font-medium">Tratamento provavel</th>
            <th className="px-4 py-3 font-medium">Validacao necessaria</th>
            <th className="px-4 py-3 font-medium">Risco</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.situation} className="border-t border-border/70 align-top">
              <td className="px-4 py-3 font-medium text-foreground">{row.situation}</td>
              <td className="px-4 py-3 text-foreground/85">{row.owner}</td>
              <td className="px-4 py-3 text-foreground/85">{row.taxMoment}</td>
              <td className="px-4 py-3 text-foreground/85">{row.probableTreatment}</td>
              <td className="px-4 py-3 text-foreground/85">{row.validation}</td>
              <td className="px-4 py-3">
                <CodeBadge
                  code={row.risk === 'low' ? 'baixo' : row.risk === 'medium' ? 'medio' : 'alto'}
                  tone={riskTone[row.risk]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProcessFlow({
  steps,
}: {
  steps: Array<{
    title: string;
    actor: string;
    document: string;
    codes?: string[];
    note: string;
    tone?: DocsTone;
  }>;
}) {
  return (
    <div data-docs-guided-block="process-flow" className="docs-guided-flow my-6 space-y-3">
      {steps.map((step, index) => (
        <div
          key={`${step.title}-${index}`}
          data-docs-guided-block="flow-step"
          className="docs-guided-card docs-guided-flow-step rounded-lg border border-border bg-card/40 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <CodeBadge code={`Etapa ${index + 1}`} tone={step.tone ?? 'slate'} />
            <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-2 text-sm text-foreground/85">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{step.actor}</span>
              </div>
              <p>
                <span className="font-medium text-foreground">Documento:</span> {step.document}
              </p>
              {step.codes?.length ? (
                <div className="flex flex-wrap gap-2">
                  {step.codes.map((code) => (
                    <CodeBadge key={code} code={code} tone={step.tone ?? 'slate'} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-md border border-border/70 bg-background/40 p-3 text-sm leading-6 text-foreground/85">
              {step.note}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ValidationNotice(props: { title: string; children: ReactNode }) {
  return <GuidanceNotice {...props} />;
}

export function FiscalCode(props: { code: string; label?: string; tone?: DocsTone }) {
  return <CodeBadge {...props} />;
}

export function LegalBasis(props: { title: string; href: string; children: ReactNode }) {
  return <ReferenceCard {...props} />;
}

export function ComplianceChecklist(props: { title: string; items: string[] }) {
  return <ChecklistPanel {...props} />;
}

export function DecisionMatrix(props: {
  rows: Array<{
    situation: string;
    owner: string;
    taxMoment: string;
    probableTreatment: string;
    validation: string;
    risk: 'low' | 'medium' | 'high';
  }>;
}) {
  return <ComparisonTable {...props} />;
}

export function OperationFlow(props: {
  steps: Array<{
    title: string;
    actor: string;
    document: string;
    codes?: string[];
    note: string;
    tone?: DocsTone;
  }>;
}) {
  return <ProcessFlow {...props} />;
}

export function WarningNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <NoticeFrame
      icon={<AlertTriangle className="h-4 w-4" />}
      title={title}
      tone="amber"
      className={toneBadgeClasses('amber')}
    >
      {children}
    </NoticeFrame>
  );
}
