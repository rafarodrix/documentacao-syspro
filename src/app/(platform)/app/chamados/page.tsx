import { getTicketsAction } from "@/actions/tickets/ticket-actions";
import { TicketsContainer } from "@/components/platform/tickets/TicketsContainer";

export default async function ClientTicketsPage() {
    // 1. Chama a MESMA Action Unificada, backend detecta que é um usuário comum e filtra apenas os tickets dele
    const { data, success } = await getTicketsAction();

    if (!success || !data) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                Não foi possível carregar seus chamados.
            </div>
        );
    }

    // 3. Renderiza o Container isAdmin={false} esconde colunas administrativas
    return <TicketsContainer tickets={data} isAdmin={false} />;
}