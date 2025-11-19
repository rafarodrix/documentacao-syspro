// Componente para listar soluções dinâmicas baseado em um caminho de pasta

import { Card } from 'fumadocs-ui/components/card';
import { source } from '@/src/lib/source';

export function DynamicSolutionsIndex({ folderPath }: { folderPath: string }) {
  if (!folderPath) {
    return <p>Erro: O caminho da pasta não foi fornecido ao componente.</p>;
  }
  
  const allPages = source.getPages();

  const solutionPages = allPages.filter((page) =>
    page.url.startsWith(folderPath)
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
            (page.data as any)?.causa_do_erro || 'A causa do erro não foi especificada.'
          }
        </Card>
      ))}
    </div>
  );
}