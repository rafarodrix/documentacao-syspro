import { getTicketsAction } from "@/actions/tickets/ticket-actions";
import { TicketsContainer } from "@/components/platform/tickets/TicketsContainer";

export default async function AdminTicketsPage() {
    // 1. Chama a Action Unificada, ela já verifica a sessão e, como é um ADMIN logado, retorna TODOS os tickets (limitado a 100)
    const { data, success } = await getTicketsAction();

    // 2. Tratamento de Erro Básico
    if (!success || !data) {
        return (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                <h3 className="font-semibold">Erro ao carregar chamados</h3>
                <p>Verifique sua conexão ou as configurações do Zammad.</p>
            </div>
        );
    }

    // 3. Renderiza o Container
    // Passamos isAdmin={true} para mostrar a coluna "Cliente"
    return <TicketsContainer tickets={data} isAdmin={true} />;
}