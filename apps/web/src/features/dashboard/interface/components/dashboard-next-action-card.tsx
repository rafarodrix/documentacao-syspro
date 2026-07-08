import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { SectionCard } from "@/components/patterns";

export function DashboardNextActionCard({
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <SectionCard
      title="Proximo passo recomendado"
      className="border-border/50 bg-linear-to-r from-card via-card/95 to-primary/[0.04] shadow-sm backdrop-blur"
      contentClassName="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          Encerramento da leitura
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button asChild className="gap-2">
          <Link href={primaryHref}>
            <ArrowUpRight className="h-4 w-4" />
            {primaryLabel}
          </Link>
        </Button>
        {secondaryHref && secondaryLabel ? (
          <Button asChild variant="outline" className="gap-2">
            <Link href={secondaryHref}>
              <Plus className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}
