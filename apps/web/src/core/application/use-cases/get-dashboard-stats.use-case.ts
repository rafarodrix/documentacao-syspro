import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";

// Estados usados no Zammad
const STATE_NAME = {
  NOVO: "1. Novo",
  EM_ANALISE: "2. Em Analise",
  EM_DESENVOLVIMENTO: "3. Em Desenvolvimento",
  EM_TESTES: "4. Em Testes",
  AGUARDANDO_CLIENTE: "5. Aguardando Validação Cliente",
};

const PRIORITY_ID_ALTA = 3;

export interface AdminDashboardStats {
  chamadosAbertos: number;
  chamadosNovos: number;
  aguardandoCliente: number;
  bugsCriticos: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const abertosQuery =
    `(state:"${STATE_NAME.EM_ANALISE}" OR state:"${STATE_NAME.EM_DESENVOLVIMENTO}" ` +
    `OR state:"${STATE_NAME.EM_TESTES}" OR state:"${STATE_NAME.AGUARDANDO_CLIENTE}")`;

  const novosQuery = `state:"${STATE_NAME.NOVO}"`;

  const pendentesQuery =
    `(state:"${STATE_NAME.EM_TESTES}" OR state:"${STATE_NAME.AGUARDANDO_CLIENTE}")`;

  const bugsQuery =
    `type:"Bug" AND priority_id:${PRIORITY_ID_ALTA} AND (${abertosQuery})`;

  try {
    const [
      chamadosAbertos,
      chamadosNovos,
      aguardandoCliente,
      bugsCriticos
    ] = await Promise.all([
      ZammadGateway.getTicketCount(abertosQuery),
      ZammadGateway.getTicketCount(novosQuery),
      ZammadGateway.getTicketCount(pendentesQuery),
      ZammadGateway.getTicketCount(bugsQuery),
    ]);

    return {
      chamadosAbertos,
      chamadosNovos,
      aguardandoCliente,
      bugsCriticos,
    };

  } catch (err) {
    console.error("Falha ao buscar estatísticas do dashboard:", err);

    return {
      chamadosAbertos: 0,
      chamadosNovos: 0,
      aguardandoCliente: 0,
      bugsCriticos: 0,
    };
  }
}
