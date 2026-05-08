import { getTaxClassificationListViewData } from "@/features/tax/application/tax-read.queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@dosc-syspro/ui";
import { FileText, Database, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/patterns";

export async function TaxClassificationList() {
  const { totalCount, items, previewLimit } = await getTaxClassificationListViewData();

  if (totalCount === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={Database}
          title="Nenhuma classificação encontrada."
          description='Clique em "Sincronizar" para popular a base.'
          dashed
        />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-md border bg-card">
      <div className="border-b bg-muted/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" />
          Registros no banco ({totalCount})
        </h3>
        {totalCount > previewLimit ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Mostrando os primeiros {previewLimit} registros para melhor performance.
          </p>
        ) : null}
      </div>

      <div className="relative max-h-[600px] w-full overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
            <TableRow>
              <TableHead className="w-[180px]">Vínculo CST</TableHead>
              <TableHead className="w-[100px]">Cod. Class.</TableHead>
              <TableHead>Descrição detalhada</TableHead>
              <TableHead className="w-[120px] text-right">Reduções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.cst ? (
                    <div className="flex w-fit items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      <span>CST {item.cst.cst}</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  ) : (
                    <span className="text-xs text-destructive">Sem vínculo</span>
                  )}
                </TableCell>

                <TableCell className="font-medium">
                  <Badge variant="outline" className="font-mono">
                    {item.code}
                  </Badge>
                </TableCell>

                <TableCell className="max-w-[400px] truncate text-sm text-muted-foreground" title={item.description}>
                  {item.description}
                </TableCell>

                <TableCell className="text-right text-xs tabular-nums">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">IBS: {Number(item.pRedIBS)}%</span>
                    <span className="text-muted-foreground">CBS: {Number(item.pRedCBS)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}