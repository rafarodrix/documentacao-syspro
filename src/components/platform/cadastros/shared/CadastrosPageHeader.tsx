"use client";

import { ShieldCheck } from "lucide-react";

interface CadastrosPageHeaderProps {
  title: string;
  description: string;
  isGlobalView?: boolean;
}

export function CadastrosPageHeader({ title, description, isGlobalView = false }: CadastrosPageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {isGlobalView && (
        <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Visao global
        </span>
      )}
    </header>
  );
}
