import type { ElementType } from 'react';
import { FileText } from 'lucide-react';
import { StaticEmptyState } from '@/components/patterns';

export function DocsEmptyState({
  message,
  icon = FileText,
}: {
  message: string;
  icon?: ElementType;
}) {
  return (
    <StaticEmptyState
      icon={icon}
      title={message}
      compact
      dashed
    />
  );
}
