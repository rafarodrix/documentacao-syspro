import { getAdminTicketsAction } from "../../../../actions/admin/ticket-actions";
import { AdminTicketsClient } from "@/components/platform/admin/AdminTicketsClient";
import { AlertTriangle } from "lucide-react";

// Revalidação ISR: Mantém a fila atualizada a cada 60 segundos no servidor,
// mas permite navegação rápida no cliente.
export const revalidate = 60;

export default async function AdminTicketsPage() {
    // 1. Busca os dados no servidor (Server Action)
    const { success, data: tickets, error } = await getAdminTicketsAction();

    // 2. Tratamento de Erro (Caso o Zammad esteja offline ou token inválido)
    if (!success) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground animate-in fade-in duration-500">
                <div className="p-4 rounded-full bg-amber-500/10 mb-4">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Erro ao carregar chamados</h2>
                <p className="text-sm max-w-md text-center">{error}</p>
            </div>
        );
    }

    // 3. Renderização do Componente Cliente (Tabela Interativa)
    // Passamos os tickets iniciais como prop para o componente gerenciar o estado (filtros, busca)
    return (
        <AdminTicketsClient initialTickets={tickets || []} />
    );
}