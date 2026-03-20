"use client";

import { Lock } from "lucide-react";

export function CadastrosAccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95 duration-300">
      <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 ring-1 ring-border/40">
        <Lock className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <h2 className="text-base font-semibold text-foreground">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground mt-1">Voce nao tem permissao para visualizar este modulo.</p>
    </div>
  );
}
