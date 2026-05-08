import { z } from "zod";

export const PORTAL_DASHBOARD_TIME_ZONE = "America/Sao_Paulo";

export const dashboardActivityPointSchema = z.object({
  label: z.string().min(1),
  value: z.number().int().nonnegative(),
});

export const dashboardTicketSummarySchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  subject: z.string().min(1),
  status: z.enum(["Aberto", "Em Análise", "Pendente", "Resolvido"]),
  priority: z.enum(["Alta", "Média", "Baixa"]),
  lastUpdate: z.string().min(1),
});

export const dashboardOpenTicketRecordSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  subject: z.string().min(1),
  team: z.enum(["SUPORTE", "DESENVOLVIMENTO"]).nullable(),
  module: z.string().nullable(),
  category: z.string().nullable(),
  priority: z.enum(["Alta", "Média", "Baixa"]),
  status: z.enum(["Aberto", "Em Análise", "Pendente"]),
});

export const dashboardTicketKpisSchema = z.object({
  open: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

export const dashboardCompanySummarySchema = z.object({
  id: z.string().min(1),
  razaoSocial: z.string().min(1),
  nomeFantasia: z.string().nullable(),
  cnpj: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_DOCS"]),
  createdAt: z.string().min(1),
  membershipsCount: z.number().int().nonnegative(),
  contactsCount: z.number().int().nonnegative().optional(),
  cidade: z.string().nullable(),
  estado: z.string().nullable(),
});

export const dashboardRecentContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  createdAt: z.string().min(1),
  companyNames: z.array(z.string().min(1)).optional(),
});

export const dashboardRecentUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
  role: z.string().min(1),
  createdAt: z.string().min(1),
  companyNames: z.array(z.string().min(1)).optional(),
});

export const dashboardSefazStatusSchema = z.object({
  uf: z.string().min(2).max(4),
  service: z.enum(["NFE", "NFCE"]),
  status: z.enum(["ONLINE", "UNSTABLE", "OFFLINE"]),
  latency: z.number().int().nonnegative(),
  checkedAt: z.string().min(1),
  changedAt: z.string().min(1),
  uptimePct: z.number().min(0).max(100).optional(),
  incidentCount: z.number().int().nonnegative().optional(),
  latencyHistory: z.array(z.number().int().nonnegative()).default([]),
});

export const dashboardSefazConfiguredRouteSchema = z.object({
  uf: z.string().min(2).max(6),
  service: z.enum(["NFE", "NFCE"]),
  active: z.boolean(),
});

export const dashboardSefazFocusUfSchema = z.string().min(2).max(2);

export const dashboardDailyPasswordSchema = z.object({
  day: z.number().int().positive(),
  month: z.number().int().positive(),
  year: z.number().int().positive(),
  password: z.number().int().nonnegative(),
  formattedDate: z.string().min(1),
});

export const dashboardCrmStageSummarySchema = z.object({
  stage: z.enum(["LEAD", "MQL", "SQL", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const dashboardCrmSummarySchema = z.object({
  activeLeads: z.number().int().nonnegative(),
  proposalLeads: z.number().int().nonnegative(),
  negotiationLeads: z.number().int().nonnegative(),
  wonLeads: z.number().int().nonnegative(),
  lostLeads: z.number().int().nonnegative(),
  overdueLeads: z.number().int().nonnegative(),
  noNextStepLeads: z.number().int().nonnegative(),
  pipelineValue: z.number().nonnegative(),
  wonValue: z.number().nonnegative(),
  stageDistribution: z.array(dashboardCrmStageSummarySchema),
});

export const dashboardContractsSummarySchema = z.object({
  activeContracts: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
});

export const dashboardCadastrosSummarySchema = z.object({
  companies: z.object({
    total: z.number().int().nonnegative(),
    registeredThisMonth: z.number().int().nonnegative(),
    inactivatedThisMonth: z.number().int().nonnegative(),
  }),
  contacts: z.object({
    total: z.number().int().nonnegative(),
    registeredThisMonth: z.number().int().nonnegative(),
    inactivatedThisMonth: z.number().int().nonnegative(),
  }),
  users: z.object({
    total: z.number().int().nonnegative(),
    registeredThisMonth: z.number().int().nonnegative(),
    inactivatedThisMonth: z.number().int().nonnegative(),
  }),
  recentInactivatedCompanies: z.array(dashboardCompanySummarySchema).default([]),
  recentInactivatedContacts: z.array(dashboardRecentContactSchema).default([]),
  recentInactivatedUsers: z.array(dashboardRecentUserSchema).default([]),
});


export const dashboardTicketFlowSchema = z.object({
  opened: z.array(dashboardActivityPointSchema).default([]),
  inProgress: z.array(dashboardActivityPointSchema).default([]),
  closed: z.array(dashboardActivityPointSchema).default([]),
});

// Per-tab data schemas
export const adminOperacionalDataSchema = z.object({
  dailyPassword: dashboardDailyPasswordSchema.nullable().optional(),
  ticketCounts: z.object({
    total: z.number().int().nonnegative(),
    support: z.number().int().nonnegative(),
    development: z.number().int().nonnegative(),
    waiting: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
  }),
  sefazHealth: z.enum(['online', 'unstable', 'offline', 'unknown']),
  sefazRoutesCount: z.number().int().nonnegative(),
  contracts: dashboardContractsSummarySchema.optional(),
  ticketFlow: dashboardTicketFlowSchema.default({ opened: [], inProgress: [], closed: [] }),
  ticketWarning: z.string().optional(),
});

export const adminSuporteDataSchema = z.object({
  openTicketRecords: z.array(dashboardOpenTicketRecordSchema).default([]),
  tickets: z.array(dashboardTicketSummarySchema),
  totalOpen: z.number().int().nonnegative(),
  activity: z.array(dashboardActivityPointSchema),
  ticketWarning: z.string().optional(),
  scopeMode: z.enum(['all', 'development']),
  allowAreaFilter: z.boolean(),
});

export const dashboardConversationStatusSummarySchema = z.object({
  status: z.enum(["Novo", "Sem responsavel", "Triagem", "Em andamento", "Aguardando cliente", "Aguardando interno", "Teste", "Resolvido", "Arquivado"]),
  count: z.number().int().nonnegative(),
});

export const dashboardConversationChannelSummarySchema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL", "PORTAL", "PHONE"]),
  count: z.number().int().nonnegative(),
});

export const dashboardConversationAssigneeLoadSchema = z.object({
  userId: z.string().nullable(),
  name: z.string().min(1),
  openCount: z.number().int().nonnegative(),
  waitingCount: z.number().int().nonnegative(),
});

export const adminAtendimentosDataSchema = z.object({
  openCount: z.number().int().nonnegative(),
  unassignedCount: z.number().int().nonnegative(),
  resolvedCount: z.number().int().nonnegative(),
  unlinkedCount: z.number().int().nonnegative(),
  avgFirstResponseMinutes: z.number().nonnegative().nullable(),
  avgResolutionHours: z.number().nonnegative().nullable(),
  activity: z.array(dashboardActivityPointSchema).default([]),
  statusCounts: z.array(dashboardConversationStatusSummarySchema).default([]),
  channelCounts: z.array(dashboardConversationChannelSummarySchema).default([]),
  assigneeLoads: z.array(dashboardConversationAssigneeLoadSchema).default([]),
  warning: z.string().optional(),
});

export const adminCadastrosDataSchema = z.object({
  canViewCompanies: z.boolean(),
  canViewContacts: z.boolean(),
  canViewUsers: z.boolean(),
  companies: z.array(dashboardCompanySummarySchema),
  recentContacts: z.array(dashboardRecentContactSchema).default([]),
  recentUsers: z.array(dashboardRecentUserSchema).default([]),
  cadastros: dashboardCadastrosSummarySchema.optional(),
  companiesCount: z.number().int().nonnegative(),
  contactsCount: z.number().int().nonnegative(),
  usersCount: z.number().int().nonnegative(),
});

export const adminComercialDataSchema = z.object({
  crm: dashboardCrmSummarySchema.optional(),
  contracts: dashboardContractsSummarySchema.optional(),
});

export const adminTabResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type AdminOperacionalData = z.infer<typeof adminOperacionalDataSchema>;
export type AdminSuporteData = z.infer<typeof adminSuporteDataSchema>;
export type AdminAtendimentosData = z.infer<typeof adminAtendimentosDataSchema>;
export type AdminCadastrosData = z.infer<typeof adminCadastrosDataSchema>;
export type AdminComercialData = z.infer<typeof adminComercialDataSchema>;

const dashboardViewBaseSchema = z.object({
  ticketWarning: z.string().optional(),
  dailyPassword: dashboardDailyPasswordSchema.nullable().optional(),
});

export const adminDashboardViewSchema = dashboardViewBaseSchema.extend({
  mode: z.literal("admin"),
  companiesCount: z.number().int().nonnegative(),
  companiesGrowth: z.number().int(),
  usersCount: z.number().int().nonnegative(),
  activeUsersCount: z.number().int().nonnegative(),
  contactsCount: z.number().int().nonnegative().default(0),
  canViewCompanies: z.boolean().default(true),
  canViewContacts: z.boolean().default(true),
  canViewUsers: z.boolean().default(true),
  companies: z.array(dashboardCompanySummarySchema),
  recentContacts: z.array(dashboardRecentContactSchema).default([]),
  recentUsers: z.array(dashboardRecentUserSchema).default([]),
  sefazFocusUfs: z.array(dashboardSefazFocusUfSchema).default([]),
  sefazStatuses: z.array(dashboardSefazStatusSchema).default([]),
  sefazNationalStatuses: z.array(dashboardSefazStatusSchema).default([]),
  sefazConfiguredRoutes: z.array(dashboardSefazConfiguredRouteSchema).default([]),
  tickets: z.array(dashboardTicketSummarySchema),
  openTicketRecords: z.array(dashboardOpenTicketRecordSchema).default([]),
  totalOpen: z.number().int().nonnegative(),
  activity: z.array(dashboardActivityPointSchema),
  crm: dashboardCrmSummarySchema.optional(),
  contracts: dashboardContractsSummarySchema.optional(),
  cadastros: dashboardCadastrosSummarySchema.optional(),
});

export const clientDashboardViewSchema = dashboardViewBaseSchema.extend({
  mode: z.literal("client"),
  companyName: z.string().min(1),
  companyUsers: z.number().int().nonnegative(),
  companyCount: z.number().int().nonnegative(),
  companyNames: z.array(z.string().min(1)),
  sefazFocusUfs: z.array(dashboardSefazFocusUfSchema).default([]),
  sefazStatuses: z.array(dashboardSefazStatusSchema).default([]),
  sefazNationalStatuses: z.array(dashboardSefazStatusSchema).default([]),
  sefazConfiguredRoutes: z.array(dashboardSefazConfiguredRouteSchema).default([]),
  tickets: z.array(dashboardTicketSummarySchema),
  openTicketRecords: z.array(dashboardOpenTicketRecordSchema).default([]),
  totalOpen: z.number().int().nonnegative(),
  kpis: dashboardTicketKpisSchema,
  activity: z.array(dashboardActivityPointSchema),
});

export const dashboardViewSchema = z.discriminatedUnion("mode", [
  adminDashboardViewSchema,
  clientDashboardViewSchema,
]);

export const dashboardResponseSchema = z.object({
  success: z.boolean(),
  data: dashboardViewSchema.optional(),
  error: z.string().optional(),
});

function getDatePartsInTimeZone(date: Date, timeZone = PORTAL_DASHBOARD_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);

  return { day, month, year };
}

export function calculateDailyPassword(day: number, month: number, year: number) {
  return day * (year + month + day);
}

export function getDailyPasswordForDate(date = new Date(), timeZone = PORTAL_DASHBOARD_TIME_ZONE) {
  const { day, month, year } = getDatePartsInTimeZone(date, timeZone);

  return {
    day,
    month,
    year,
    password: calculateDailyPassword(day, month, year),
    formattedDate: new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
  };
}

export type DashboardActivityPoint = z.infer<typeof dashboardActivityPointSchema>;
export type DashboardTicketFlow = z.infer<typeof dashboardTicketFlowSchema>;
export type DashboardTicketSummary = z.infer<typeof dashboardTicketSummarySchema>;
export type DashboardOpenTicketRecord = z.infer<typeof dashboardOpenTicketRecordSchema>;
export type DashboardTicketKpis = z.infer<typeof dashboardTicketKpisSchema>;
export type DashboardCompanySummary = z.infer<typeof dashboardCompanySummarySchema>;
export type DashboardRecentContact = z.infer<typeof dashboardRecentContactSchema>;
export type DashboardRecentUser = z.infer<typeof dashboardRecentUserSchema>;
export type DashboardSefazStatus = z.infer<typeof dashboardSefazStatusSchema>;
export type DashboardSefazConfiguredRoute = z.infer<typeof dashboardSefazConfiguredRouteSchema>;
export type DashboardSefazFocusUf = z.infer<typeof dashboardSefazFocusUfSchema>;
export type DashboardDailyPassword = z.infer<typeof dashboardDailyPasswordSchema>;
export type DashboardCrmStageSummary = z.infer<typeof dashboardCrmStageSummarySchema>;
export type DashboardCrmSummary = z.infer<typeof dashboardCrmSummarySchema>;
export type DashboardContractsSummary = z.infer<typeof dashboardContractsSummarySchema>;
export type DashboardCadastrosSummary = z.infer<typeof dashboardCadastrosSummarySchema>;
export type AdminDashboardView = z.infer<typeof adminDashboardViewSchema>;
export type ClientDashboardView = z.infer<typeof clientDashboardViewSchema>;
export type DashboardView = z.infer<typeof dashboardViewSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
