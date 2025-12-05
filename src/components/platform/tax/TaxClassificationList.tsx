import { prisma } from "@/lib/prisma";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Database, ArrowRight } from "lucide-react";

export async function TaxClassificationList() {
    const items = await prisma.taxClassification.findMany({
        orderBy: { code: "asc" },
        include: {
            cst: true, // <--- AGORA PODEMOS BUSCAR O PAI (CST)
        }
    });

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/30 text-muted-foreground mt-4">
                <Database className="h-10 w-10 opacity-20 mb-2" />
                <p className="text-sm">Nenhuma classificação encontrada.</p>
                <p className="text-xs">Clique em "Sincronizar" para popular a base.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border mt-6 bg-card">
            <div className="p-4 border-b bg-muted/40">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Registros no Banco ({items.length})
                </h3>
            </div>

            <div className="relative w-full overflow-auto max-h-[600px]">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[180px]">Vínculo CST</TableHead>
                            <TableHead className="w-[100px]">Cód. Class.</TableHead>
                            <TableHead>Descrição Detalhada</TableHead>
                            <TableHead className="w-[120px] text-right">Reduções</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                {/* Coluna do CST (Pai) */}
                                <TableCell>
                                    {item.cst ? (
                                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md w-fit">
                                            <span>CST {item.cst.cst}</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                    ) : (
                                        <span className="text-destructive text-xs">Sem Vínculo</span>
                                    )}
                                </TableCell>

                                <TableCell className="font-medium">
                                    <Badge variant="outline" className="font-mono">
                                        {item.code}
                                    </Badge>
                                </TableCell>

                                <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate" title={item.description}>
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