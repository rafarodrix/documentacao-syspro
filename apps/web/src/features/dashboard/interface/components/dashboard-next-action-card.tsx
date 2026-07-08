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
      className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
      contentClassName="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
    >
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
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
