import { Card } from "fumadocs-ui/components/card";
import { source } from "@/lib/source";

type SolutionPageData = {
  causa_do_erro?: string;
};

export function DynamicSolutionsIndex({ folderPath }: { folderPath: string }) {
  if (!folderPath) {
    return <p>Erro: O caminho da pasta nao foi fornecido ao componente.</p>;
  }

  const allPages = source.getPages();
  const solutionPages = allPages.filter((page) => page.url.startsWith(folderPath));

  if (solutionPages.length === 0) {
    return <p>Nenhuma solucao encontrada nesta secao.</p>;
  }

  return (
    <div className="space-y-4">
      {solutionPages.map((page) => {
        const pageData = page.data as SolutionPageData;

        return (
          <Card
            key={page.url}
            href={page.url}
            title={page.data.title}
            className="w-full"
          >
            {pageData.causa_do_erro ?? "A causa do erro nao foi especificada."}
          </Card>
        );
      })}
    </div>
  );
}
