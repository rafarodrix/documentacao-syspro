import type { ReactNode } from "react";
import { PageHeader } from "@/components/patterns";

interface CadastrosPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function CadastrosPageHeader({ title, description, actions }: CadastrosPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      actions={actions}
    />
  );
}

