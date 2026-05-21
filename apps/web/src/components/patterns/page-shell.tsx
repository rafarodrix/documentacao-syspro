import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-4 space-y-5 pb-8 duration-700", className)}>
      {children}
    </div>
  );
}
