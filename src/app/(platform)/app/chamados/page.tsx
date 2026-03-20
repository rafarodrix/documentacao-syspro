import { getTicketsAction } from "@/actions/tickets/ticket-actions";
import { requireSession } from "@/lib/auth-helpers";
import { TicketsContainer } from "@/components/platform/tickets/TicketsContainer";

const SYSTEM_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];

export default async function TicketsPage() {
  const session = await requireSession();
  const { data, success } = await getTicketsAction();

  if (!success || !data) {
    return (
      <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
        <h3 className="font-semibold">Erro ao carregar chamados</h3>
        <p>Verifique sua conexao ou as configuracoes do Zammad.</p>
      </div>
    );
  }

  return <TicketsContainer tickets={data} isAdmin={SYSTEM_ROLES.includes(session.role)} />;
}
