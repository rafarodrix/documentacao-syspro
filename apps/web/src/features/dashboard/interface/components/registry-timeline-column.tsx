import type { ReactNode } from "react";

interface RegistryTimelineColumnProps {
  title: string;
  accentClassName: string;
  children: ReactNode;
}

export function RegistryTimelineColumn({
  title,
  accentClassName,
  children,
}: RegistryTimelineColumnProps) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-foreground">
        <span className={accentClassName} />
        {title}
      </h3>
      {children}
    </div>
  );
}
