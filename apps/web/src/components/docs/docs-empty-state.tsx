import type { ElementType } from 'react';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/patterns';

export function DocsEmptyState({
  message,
  icon = FileText,
}: {
  message: string;
  icon?: ElementType;
}) {
  return (
    <EmptyState
      icon={icon}
      title={message}
      compact
      dashed
    />
  );
}
