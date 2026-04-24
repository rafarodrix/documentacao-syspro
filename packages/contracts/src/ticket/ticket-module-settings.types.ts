import { z } from "zod";

export const ticketCategoryTypeSchema = z.enum(["SUPORTE", "BUG", "MELHORIA", "NOVA_FUNCIONALIDADE"]);
export type TicketCategoryType = z.infer<typeof ticketCategoryTypeSchema>;

export const ticketModuleSettingsOptionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  description: z.string().trim().optional(),
  defaultTeam: z.enum(["SUPORTE", "DESENVOLVIMENTO"]).optional(),
});

export const ticketCategorySettingsOptionSchema = ticketModuleSettingsOptionSchema.extend({
  type: ticketCategoryTypeSchema,
});

export const ticketModuleSettingsPrioritySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
  color: z.string().trim().optional(),
  firstResponseMinutes: z.number().int().positive().optional(),
  resolutionMinutes: z.number().int().positive().optional(),
  slaHours: z.number().int().positive(),
});

export const ticketNotificationGroupSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  jid: z.string().trim().min(1),
  active: z.boolean().default(true),
});

export const DEFAULT_TICKET_QUICK_REPLY_TEMPLATES = [
  {
    id: "request-access",
    label: "Solicitar acesso",
    value: "Para prosseguir, preciso de acesso ao ambiente/servidor onde o problema ocorre. Pode me encaminhar os dados ou liberar o acesso remoto?",
  },
  {
    id: "integration-done",
    label: "Integracao concluida",
    value: "A integracao foi configurada e validada. Peco que realize um novo teste operacional e me sinalize caso encontre algum comportamento diferente.",
  },
  {
    id: "analysis-running",
    label: "Analise em andamento",
    value: "Estou analisando os registros e retorno assim que identificar a causa ou o proximo ajuste necessario.",
  },
];

export const ticketModuleSettingsSchema = z.object({
  categories: z.array(ticketCategorySettingsOptionSchema).min(1),
  priorities: z.array(ticketModuleSettingsPrioritySchema).min(1),
  teams: z.array(ticketModuleSettingsOptionSchema).min(1),
  modules: z.array(ticketModuleSettingsOptionSchema).min(1),
  quickReplyTemplates: z.array(ticketModuleSettingsOptionSchema).default(DEFAULT_TICKET_QUICK_REPLY_TEMPLATES),
  autoAssignToCreator: z.boolean(),
  autoResponseEnabled: z.boolean(),
  autoResponseMessage: z.string(),
  defaultPriority: z.string().trim().min(1),
  defaultTeam: z.enum(["SUPORTE", "DESENVOLVIMENTO"]),
  supportNotificationGroups: z.array(ticketNotificationGroupSchema).default([]),
  developmentNotificationGroups: z.array(ticketNotificationGroupSchema).default([]),
});

export const ticketModuleSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: ticketModuleSettingsSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type TicketModuleSettingsOption = z.infer<typeof ticketModuleSettingsOptionSchema>;
export type TicketModuleSettingsPriority = z.infer<typeof ticketModuleSettingsPrioritySchema>;
export type TicketNotificationGroup = z.infer<typeof ticketNotificationGroupSchema>;
export type TicketModuleSettings = z.infer<typeof ticketModuleSettingsSchema>;
export type TicketModuleSettingsResponse = z.infer<typeof ticketModuleSettingsResponseSchema>;

export const DEFAULT_TICKET_MODULE_SETTINGS: TicketModuleSettings = {
  categories: [
    { id: "incident", label: "Erro", value: "incident", icon: "🔴", defaultTeam: "SUPORTE", type: "SUPORTE" },
    { id: "question", label: "Duvida", value: "question", icon: "💬", defaultTeam: "SUPORTE", type: "SUPORTE" },
    { id: "configuration", label: "Configuracao", value: "configuration", icon: "⚙️", defaultTeam: "SUPORTE", type: "SUPORTE" },
    { id: "training", label: "Treinamento", value: "training", icon: "📚", defaultTeam: "SUPORTE", type: "SUPORTE" },
    { id: "data-issue", label: "Problema de Dados", value: "data-issue", icon: "📝", defaultTeam: "SUPORTE", type: "SUPORTE" },
    { id: "integration-issue", label: "Integracao", value: "integration-issue", icon: "🔗", defaultTeam: "SUPORTE", type: "SUPORTE" },
    { id: "bug", label: "Bug", value: "bug", icon: "🐞", defaultTeam: "DESENVOLVIMENTO", type: "BUG" },
    { id: "enhancement", label: "Melhoria", value: "enhancement", icon: "✨", defaultTeam: "DESENVOLVIMENTO", type: "MELHORIA" },
    { id: "new-feature", label: "Nova Funcionalidade", value: "new-feature", icon: "🚀", defaultTeam: "DESENVOLVIMENTO", type: "NOVA_FUNCIONALIDADE" },
    { id: "performance", label: "Performance", value: "performance", icon: "⚡", defaultTeam: "DESENVOLVIMENTO", type: "MELHORIA" },
    { id: "refactoring", label: "Refatoracao", value: "refactoring", icon: "🛠️", defaultTeam: "DESENVOLVIMENTO", type: "MELHORIA" },
  ],
  priorities: [
    {
      id: "1",
      label: "Baixa",
      value: "1 low",
      color: "bg-zinc-100 text-zinc-600",
      firstResponseMinutes: 240,
      resolutionMinutes: 4320,
      slaHours: 72,
    },
    {
      id: "2",
      label: "Normal",
      value: "2 normal",
      color: "bg-blue-100 text-blue-700",
      firstResponseMinutes: 60,
      resolutionMinutes: 1440,
      slaHours: 24,
    },
    {
      id: "3",
      label: "Alta (Urgente)",
      value: "3 high",
      color: "bg-red-100 text-red-700",
      firstResponseMinutes: 15,
      resolutionMinutes: 240,
      slaHours: 4,
    },
  ],
  teams: [
    { id: "support", label: "Suporte", value: "SUPORTE", color: "bg-blue-100 text-blue-700" },
    { id: "development", label: "Desenvolvimento", value: "DESENVOLVIMENTO", color: "bg-violet-100 text-violet-700" },
  ],
  modules: [
    { id: "cadastro", label: "Cadastro", value: "cadastro" },
    { id: "cadastro-empresa", label: "Cadastro > Empresa", value: "cadastro/empresa" },
    { id: "cadastro-participante", label: "Cadastro > Participante", value: "cadastro/participante" },
    { id: "cadastro-periferico", label: "Cadastro > Periferico", value: "cadastro/periferico" },
    { id: "cadastro-postal", label: "Cadastro > Postal", value: "cadastro/postal" },
    { id: "cadastro-retorno-embalagem", label: "Cadastro > Retorno Embalagem", value: "cadastro/retorno-embalagem" },
    { id: "cadastro-servico", label: "Cadastro > Servico", value: "cadastro/servico" },
    { id: "cadastro-tabela", label: "Cadastro > Tabela", value: "cadastro/tabela" },
    { id: "cadastro-usuario", label: "Cadastro > Usuario", value: "cadastro/usuario" },
    { id: "estoque", label: "Estoque", value: "estoque" },
    { id: "estoque-departamento", label: "Estoque > Departamento", value: "estoque/departamento" },
    { id: "estoque-estoques", label: "Estoque > Estoques", value: "estoque/estoques" },
    { id: "estoque-grupo", label: "Estoque > Grupo", value: "estoque/grupo" },
    { id: "estoque-inventario", label: "Estoque > Inventario", value: "estoque/inventario" },
    { id: "estoque-produto", label: "Estoque > Produto", value: "estoque/produto" },
    { id: "estoque-promocao", label: "Estoque > Promocao", value: "estoque/promocao" },
    { id: "estoque-tabela", label: "Estoque > Tabela", value: "estoque/tabela" },
    { id: "compra", label: "Compra", value: "compra" },
    { id: "compra-cotacao", label: "Compra > Cotacao", value: "compra/cotacao" },
    { id: "compra-digitacao-preco", label: "Compra > Digitacao de Preco", value: "compra/digitacao-de-preco" },
    { id: "compra-pedido-compra", label: "Compra > Pedido de Compra", value: "compra/pedido-de-compra" },
    { id: "compra-requisicao", label: "Compra > Requisicao", value: "compra/requisicao" },
    {
      id: "compra-requisicao-compra-material",
      label: "Compra > Requisicao Compra Material",
      value: "compra/requisicao-compra-material",
    },
    { id: "financeiro", label: "Financeiro", value: "financeiro" },
    { id: "financeiro-banco", label: "Financeiro > Banco", value: "financeiro/banco" },
    { id: "financeiro-caixa", label: "Financeiro > Caixa", value: "financeiro/caixa" },
    { id: "financeiro-cartao", label: "Financeiro > Cartao", value: "financeiro/cartao" },
    { id: "financeiro-configuracao", label: "Financeiro > Configuracao", value: "financeiro/configuracao" },
    { id: "financeiro-contas", label: "Financeiro > Contas", value: "financeiro/contas" },
    { id: "financeiro-emitente", label: "Financeiro > Emitente", value: "financeiro/emitente" },
    { id: "financeiro-faturamento", label: "Financeiro > Faturamento", value: "financeiro/faturamento" },
    { id: "financeiro-plano-pagamento", label: "Financeiro > Plano de Pagamento", value: "financeiro/plano-de-pagamento" },
    { id: "financeiro-portador", label: "Financeiro > Portador", value: "financeiro/portador" },
    { id: "financeiro-rh", label: "Financeiro > RH", value: "financeiro/rh" },
    { id: "financeiro-titulos", label: "Financeiro > Titulos", value: "financeiro/titulos" },
    { id: "movimento", label: "Movimento", value: "movimento" },
    { id: "movimento-analise", label: "Movimento > Analise", value: "movimento/analise" },
    { id: "movimento-dashboard", label: "Movimento > Dashboard", value: "movimento/dashboard" },
    { id: "movimento-documento", label: "Movimento > Documento", value: "movimento/documento" },
    { id: "movimento-entrega", label: "Movimento > Entrega", value: "movimento/entrega" },
    {
      id: "movimento-lancamento-documentos",
      label: "Movimento > Lancamento de Documentos",
      value: "movimento/lancamento-de-documentos",
    },
    { id: "movimento-mobile-coletor", label: "Movimento > Mobile Coletor", value: "movimento/mobile-coletor" },
    { id: "movimento-ordem-servico", label: "Movimento > Ordem de Servico", value: "movimento/ordem-de-servico" },
    { id: "movimento-pedido-venda", label: "Movimento > Pedido de Venda", value: "movimento/pedido-de-venda" },
    { id: "movimento-perda-mercadoria", label: "Movimento > Perda de Mercadoria", value: "movimento/perda-de-mercadoria" },
    {
      id: "movimento-status-auditoria-produto",
      label: "Movimento > Status e Auditoria de Produto",
      value: "movimento/status-e-auditoria-de-produto",
    },
    { id: "movimento-transporte", label: "Movimento > Transporte", value: "movimento/transporte" },
    { id: "fiscal", label: "Fiscal", value: "fiscal" },
    { id: "fiscal-grupo", label: "Fiscal > Grupo", value: "fiscal/grupo" },
    { id: "fiscal-mapa-resumo", label: "Fiscal > Mapa Resumo", value: "fiscal/mapa-resumo" },
    { id: "fiscal-sintegra", label: "Fiscal > Sintegra", value: "fiscal/sintegra" },
    { id: "fiscal-sped", label: "Fiscal > Sped", value: "fiscal/sped" },
    { id: "fiscal-tabela", label: "Fiscal > Tabela", value: "fiscal/tabela" },
    { id: "fiscal-tributacao", label: "Fiscal > Tributacao", value: "fiscal/tributacao" },
    { id: "contabil", label: "Contabil", value: "contabil" },
    { id: "producao", label: "Producao", value: "producao" },
    { id: "producao-agenda", label: "Producao > Agenda", value: "producao/agenda" },
    { id: "producao-produto-estoque", label: "Producao > Produto de Estoque", value: "producao/produto-de-estoque" },
    { id: "producao-setores", label: "Producao > Setores", value: "producao/setores" },
    { id: "venda", label: "Venda", value: "venda" },
    { id: "venda-balcao", label: "Venda > Balcao", value: "venda/balcao" },
    { id: "venda-campanha", label: "Venda > Campanha", value: "venda/campanha" },
    { id: "venda-estacao", label: "Venda > Estacao", value: "venda/estacao" },
    { id: "venda-meta", label: "Venda > Meta", value: "venda/meta" },
    { id: "venda-orcamento", label: "Venda > Orcamento", value: "venda/orcamento" },
    { id: "venda-paf", label: "Venda > PAF", value: "venda/paf" },
    { id: "venda-shipay", label: "Venda > Shipay", value: "venda/shipay" },
    { id: "relatorio", label: "Relatorio", value: "relatorio" },
  ],
  quickReplyTemplates: DEFAULT_TICKET_QUICK_REPLY_TEMPLATES,
  autoAssignToCreator: true,
  autoResponseEnabled: false,
  autoResponseMessage: "Ola! Recebemos sua solicitacao e nossa equipe ja esta ciente. Retornaremos em breve com uma analise detalhada.",
  defaultPriority: "2 normal",
  defaultTeam: "SUPORTE",
  supportNotificationGroups: [],
  developmentNotificationGroups: [],
};
