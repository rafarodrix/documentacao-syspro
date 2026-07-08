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
      className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
      contentClassName="space-y-4"
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </SectionCard>
  );
}
