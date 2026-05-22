"use client";

import { PageHeader } from "@/components/patterns";

interface CadastrosPageHeaderProps {
  title: string;
  description: string;
}

export function CadastrosPageHeader({ title, description }: CadastrosPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
    />
  );
}
