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

export const dashboardSefazStatusSchema = z.object({
  uf: z.string().min(2).max(2),
  service: z.enum(["NFE", "NFCE"]),
  status: z.enum(["ONLINE", "UNSTABLE", "OFFLINE"]),
  latency: z.number().int().nonnegative(),
  checkedAt: z.string().min(1),
  changedAt: z.string().min(1),
});

export const dashboardDailyPasswordSchema = z.object({
  day: z.number().int().positive(),
  month: z.number().int().positive(),
  year: z.number().int().positive(),
  password: z.number().int().nonnegative(),
  formattedDate: z.string().min(1),
});

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
  contactsCount: z.number().int().nonnegative(),
  canViewUsers: z.boolean(),
  companies: z.array(dashboardCompanySummarySchema),
  sefazNfe: dashboardSefazStatusSchema,
  sefazNfce: dashboardSefazStatusSchema,
  tickets: z.array(dashboardTicketSummarySchema),
  totalOpen: z.number().int().nonnegative(),
  activity: z.array(dashboardActivityPointSchema),
});

export const clientDashboardViewSchema = dashboardViewBaseSchema.extend({
  mode: z.literal("client"),
  companyName: z.string().min(1),
  companyUsers: z.number().int().nonnegative(),
  companyCount: z.number().int().nonnegative(),
  companyNames: z.array(z.string().min(1)),
  tickets: z.array(dashboardTicketSummarySchema),
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
export type DashboardTicketSummary = z.infer<typeof dashboardTicketSummarySchema>;
export type DashboardTicketKpis = z.infer<typeof dashboardTicketKpisSchema>;
export type DashboardCompanySummary = z.infer<typeof dashboardCompanySummarySchema>;
export type DashboardSefazStatus = z.infer<typeof dashboardSefazStatusSchema>;
export type DashboardDailyPassword = z.infer<typeof dashboardDailyPasswordSchema>;
export type AdminDashboardView = z.infer<typeof adminDashboardViewSchema>;
export type ClientDashboardView = z.infer<typeof clientDashboardViewSchema>;
export type DashboardView = z.infer<typeof dashboardViewSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
