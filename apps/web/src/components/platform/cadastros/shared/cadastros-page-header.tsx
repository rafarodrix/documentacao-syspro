"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/patterns";

interface CadastrosPageHeaderProps {
  title: string;
  description: string;
  isGlobalView?: boolean;
}

export function CadastrosPageHeader({ title, description, isGlobalView = false }: CadastrosPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      badge={isGlobalView ? { icon: ShieldCheck, label: "Visao global", variant: "purple" } : undefined}
    />
  );
}
