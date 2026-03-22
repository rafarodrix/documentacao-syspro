import dynamic from 'next/dynamic';

const Playground = dynamic(
  () => import('./DocsPlaygroundClient').then((mod) => mod.DocsPlaygroundClient),
  {
    ssr: false,
  },
);

export function PlaygroundInline({
  code,
  height,
  title,
}: {
  code: string;
  height?: number;
  title?: string;
}) {
  return <Playground code={code} height={height} title={title} />;
}
