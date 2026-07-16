import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { FileText } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

interface StaticEmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children?: ReactNode;
  compact?: boolean;
  dashed?: boolean;
  className?: string;
}

export function StaticEmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  children,
  compact = false,
  dashed = false,
  className,
}: StaticEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-3 py-6 px-4" : "gap-4 py-12 px-6",
        dashed && "rounded-lg border border-dashed border-border/60",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-border bg-muted/40",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground/40",
            compact ? "h-5 w-5" : "h-7 w-7",
          )}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>

      {action ? (
        <Button variant="outline" size="sm" className="gap-2 border-dashed h-8" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}

      {children}
    </div>
  );
}
