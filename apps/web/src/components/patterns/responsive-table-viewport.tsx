import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveTableViewport({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("w-full min-w-0 overflow-x-auto", className)}>
      <div className={cn("min-w-max", innerClassName)}>{children}</div>
    </div>
  );
}
