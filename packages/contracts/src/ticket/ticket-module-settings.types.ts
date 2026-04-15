import { z } from "zod";

export const ticketModuleSettingsOptionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  defaultTeam: z.enum(["SUPORTE", "DESENVOLVIMENTO"]).optional(),
});

export const ticketModuleSettingsPrioritySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
  color: z.string().trim().optional(),
  slaHours: z.number().int().positive(),
});

export const ticketModuleSettingsSchema = z.object({
  categories: z.array(ticketModuleSettingsOptionSchema).min(1),
  priorities: z.array(ticketModuleSettingsPrioritySchema).min(1),
  teams: z.array(ticketModuleSettingsOptionSchema).min(1),
  modules: z.array(ticketModuleSettingsOptionSchema).min(1),
  environments: z.array(ticketModuleSettingsOptionSchema).min(1),
  autoAssignToCreator: z.boolean(),
  autoResponseEnabled: z.boolean(),
  autoResponseMessage: z.string(),
  defaultPriority: z.string().trim().min(1),
  defaultTeam: z.enum(["SUPORTE", "DESENVOLVIMENTO"]),
  defaultEnvironment: z.string().trim().min(1),
});

export const ticketModuleSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: ticketModuleSettingsSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type TicketModuleSettingsOption = z.infer<typeof ticketModuleSettingsOptionSchema>;
export type TicketModuleSettingsPriority = z.infer<typeof ticketModuleSettingsPrioritySchema>;
export type TicketModuleSettings = z.infer<typeof ticketModuleSettingsSchema>;
export type TicketModuleSettingsResponse = z.infer<typeof ticketModuleSettingsResponseSchema>;

export const DEFAULT_TICKET_MODULE_SETTINGS: TicketModuleSettings = {
  categories: [
    { id: "incident", label: "Incidente / Erro", value: "incident", icon: "🔴", color: "bg-red-100 text-red-700", defaultTeam: "SUPORTE" },
    { id: "question", label: "Duvida", value: "question", icon: "🔵", color: "bg-blue-100 text-blue-700", defaultTeam: "SUPORTE" },
    { id: "request", label: "Solicitacao", value: "request", icon: "🟢", color: "bg-emerald-100 text-emerald-700", defaultTeam: "SUPORTE" },
    { id: "bug", label: "Bug", value: "bug", icon: "🛠", color: "bg-orange-100 text-orange-700", defaultTeam: "DESENVOLVIMENTO" },
  ],
  priorities: [
    { id: "1", label: "Baixa", value: "1 low", color: "bg-zinc-100 text-zinc-600", slaHours: 48 },
    { id: "2", label: "Normal", value: "2 normal", color: "bg-blue-100 text-blue-700", slaHours: 24 },
    { id: "3", label: "Alta (Urgente)", value: "3 high", color: "bg-red-100 text-red-700", slaHours: 4 },
  ],
  teams: [
    { id: "support", label: "Suporte", value: "SUPORTE", color: "bg-blue-100 text-blue-700" },
    { id: "development", label: "Desenvolvimento", value: "DESENVOLVIMENTO", color: "bg-violet-100 text-violet-700" },
  ],
  modules: [
    { id: "fiscal", label: "Fiscal", value: "fiscal" },
    { id: "vendas", label: "Vendas", value: "vendas" },
    { id: "financeiro", label: "Financeiro", value: "financeiro" },
    { id: "estoque", label: "Estoque", value: "estoque" },
    { id: "pdv", label: "PDV", value: "pdv" },
    { id: "api", label: "API / Integracoes", value: "api" },
  ],
  environments: [
    { id: "production", label: "Producao", value: "production" },
    { id: "staging", label: "Homologacao", value: "staging" },
    { id: "training", label: "Treinamento", value: "training" },
  ],
  autoAssignToCreator: true,
  autoResponseEnabled: false,
  autoResponseMessage: "Ola! Recebemos sua solicitacao e nossa equipe ja esta ciente. Retornaremos em breve com uma analise detalhada.",
  defaultPriority: "2 normal",
  defaultTeam: "SUPORTE",
  defaultEnvironment: "production",
};
