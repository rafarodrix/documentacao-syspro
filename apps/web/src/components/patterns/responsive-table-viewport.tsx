import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveTableViewport({
  children,
  className,
  innerClassName,
  flexible = false,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  flexible?: boolean;
}) {
  return (
    <div className={cn(flexible ? "w-full min-w-0" : "w-full min-w-0 overflow-x-auto", className)}>
      <div className={cn(flexible ? "w-full" : "min-w-max", innerClassName)}>{children}</div>
    </div>
  );
}
