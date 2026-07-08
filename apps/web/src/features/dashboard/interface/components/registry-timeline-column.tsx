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
      <h3 className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
        <span className={accentClassName} />
        {title}
      </h3>
      {children}
    </div>
  );
}
