"use client";

import type { ElementType, ReactNode } from "react";
import { FileText } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  children?: ReactNode;
  compact?: boolean;
  dashed?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  children,
  compact = false,
  dashed = false,
  className,
}: EmptyStateProps) {
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
        <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-sm")}>
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {action && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-dashed h-8"
          onClick={action.onClick}
          {...(action.href ? { asChild: true } : {})}
        >
          {action.href ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            action.label
          )}
        </Button>
      )}

      {children}
    </div>
  );
}
