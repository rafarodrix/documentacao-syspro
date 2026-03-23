'use client';

import { DocsPlaygroundClient } from './DocsPlaygroundClient';

export function PlaygroundInline({
  code,
  height,
  title,
}: {
  code: string;
  height?: number;
  title?: string;
}) {
  return <DocsPlaygroundClient code={code} height={height} title={title} />;
}
