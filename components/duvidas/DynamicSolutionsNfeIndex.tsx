import { Card, Cards } from 'fumadocs-ui/components/card';
import { source } from '@/lib/source';

export function DynamicSolutionsNfeIndex() {
  const allPages = source.getPages();

  const solutionPages = allPages.filter((page) =>
    page.url.startsWith('/docs/duvidas/rejeicoes/solutions-nfe/')
  );

  if (!solutionPages || solutionPages.length === 0) {
    return <p>Nenhuma solução encontrada nesta seção.</p>;
  }

  return (
    <div className="space-y-4">
      {solutionPages.map((page) => (
        <Card
          key={page.url}
          href={page.url}
          title={page.data.title}
          className="w-full"
        >
          {
            // Usa optional chaining para evitar erro de TS
            (page.data as any)?.causa_do_erro || 'A causa do erro não foi especificada.'
          }
        </Card>
      ))}
    </div>
  );
}
