// lib/stats.ts
import { getZammadTicketsCount } from '@/lib/releases';

// --- Constantes de Estado e Prioridade ---
const STATE_NAME = {
  NOVO: "Novo",
  EM_ANALISE: "Em Análise",
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  EM_TESTES: "Em Testes",
  AGUARDANDO_CLIENTE: "Aguardando Validação Cliente",
};

const PRIORITY_ID_ALTA = 3; 

export interface AdminDashboardStats {
  chamadosAbertos: number;
  chamadosNovos: number;
  aguardandoCliente: number;
  bugsCriticos: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {


  // "Chamados Abertos" = Em Análise + Em Desenvolvimento + Em Testes + Aguardando Validação
  const abertosQuery = `(state.name:"${STATE_NAME.EM_ANALISE}" OR state.name:"${STATE_NAME.EM_DESENVOLVIMENTO}" OR state.name:"${STATE_NAME.EM_TESTES}" OR state.name:"${STATE_NAME.AGUARDANDO_CLIENTE}")`;
  
  // "Chamados Novos"
  const novosQuery = `state.name:"${STATE_NAME.NOVO}"`;

  // "Aguardando Cliente" = Em Testes + Aguardando Validação Cliente
  const pendentesQuery = `(state.name:"${STATE_NAME.EM_TESTES}" OR state.name:"${STATE_NAME.AGUARDANDO_CLIENTE}")`;
  
  // "Bugs Críticos" = Abertos + Tipo Bug + Prioridade Alta
  const bugsQuery = `type:"Bug" AND priority_id:${PRIORITY_ID_ALTA} AND (${abertosQuery})`;

  try {
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