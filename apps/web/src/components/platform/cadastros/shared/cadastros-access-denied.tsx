"use client";

import { Lock } from "lucide-react";
import { EmptyState } from "@/components/patterns";

export function CadastrosAccessDenied() {
  return (
    <EmptyState
      icon={Lock}
      title="Acesso restrito"
      description="Voce nao tem permissao para visualizar este modulo."
      className="h-[60vh] animate-in fade-in zoom-in-95 duration-300"
    />
  );
}
