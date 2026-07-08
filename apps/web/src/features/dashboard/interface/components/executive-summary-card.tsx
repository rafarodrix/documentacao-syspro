import type { ReactNode } from "react";
import { SectionCard } from "@/components/patterns";

export function ExecutiveSummaryCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      className="border-border/50 bg-linear-to-br from-card via-card/95 to-primary/[0.03] shadow-sm backdrop-blur"
      contentClassName="space-y-5"
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          Cockpit executivo
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </SectionCard>
  );
}
