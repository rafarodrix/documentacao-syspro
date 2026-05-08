import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderBadge {
  icon?: ElementType;
  label: string;
  variant?: "default" | "info" | "success" | "warning" | "purple";
}

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: PageHeaderBadge;
  actions?: ReactNode;
  className?: string;
}

const BADGE_STYLES: Record<NonNullable<PageHeaderBadge["variant"]>, string> = {
  default: "bg-muted text-muted-foreground border-border",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const BadgeIcon = badge?.icon;
  const badgeStyle = BADGE_STYLES[badge?.variant ?? "default"];

  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {badge && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              badgeStyle,
            )}
          >
            {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
            {badge.label}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}
