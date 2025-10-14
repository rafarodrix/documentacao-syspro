// lib/stats.ts
import { getZammadTicketsCount } from '@/lib/releases'; // Importamos a nova função

// ... (suas constantes de ID continuam aqui) ...
const STATE_ID_NOVO = 1;
const STATE_ID_PENDENTE = 3;
const PRIORITY_ID_ALTA = 3;

export interface AdminDashboardStats {
  chamadosAbertos: number;
  chamadosNovos: number;
  aguardandoCliente: number;
  bugsCriticos: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  // As mesmas queries de antes
  const abertosQuery = `state_id:[1 TO 3]`;
  const novosQuery = `state_id:${STATE_ID_NOVO}`;
  const pendentesQuery = `state_id:${STATE_ID_PENDENTE}`;
  const bugsQuery = `type:"Bug" AND priority_id:${PRIORITY_ID_ALTA} AND state_id:[1 TO 3]`;

  try {
    // Usamos a nova função para buscar as contagens em paralelo
    const [
      chamadosAbertos,
      chamadosNovos,
      aguardandoCliente,
      bugsCriticos
    ] = await Promise.all([
      getZammadTicketsCount(abertosQuery),
      getZammadTicketsCount(novosQuery),
      getZammadTicketsCount(pendentesQuery),
      getZammadTicketsCount(bugsQuery)
    ]);

    // Retornamos os dados REAIS
    return {
      chamadosAbertos,
      chamadosNovos,
      aguardandoCliente,
      bugsCriticos,
    };

  } catch (error) {
    console.error("Falha ao buscar estatísticas do dashboard:", error);
    return { chamadosAbertos: 0, chamadosNovos: 0, aguardandoCliente: 0, bugsCriticos: 0 };
  }
}