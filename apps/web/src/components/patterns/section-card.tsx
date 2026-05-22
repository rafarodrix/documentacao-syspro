import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  footer,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("relative overflow-hidden border-border/40 bg-card/75 backdrop-blur-md dark:bg-zinc-950/45 shadow-sm", className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <CardHeader className="px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-0.5 text-xs">
                {description}
              </CardDescription>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>

      <CardContent className={cn("px-5 pb-5", contentClassName)}>
        {children}
      </CardContent>

      {footer && (
        <CardFooter className="border-t border-border/40 px-5 py-3">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
