import { prisma } from "@/lib/prisma"; // Verifique se o seu import é 'db' ou 'prisma'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Database } from "lucide-react";

export async function TaxClassificationList() {
    // Busca direta no banco (Server Component)
    const items = await prisma.taxClassification.findMany({
        orderBy: {
            code: "asc",
        },
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

            <div className="relative w-full overflow-auto max-h-[400px]">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[80px]">Código</TableHead>
                            <TableHead>Descrição da Classificação</TableHead>
                            <TableHead className="w-[150px] text-right">Atualizado em</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    <Badge variant="outline" className="font-mono">
                                        {item.code}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {item.name}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                                    {item.updatedAt.toLocaleDateString("pt-BR")}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}