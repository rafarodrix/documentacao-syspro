import { z } from "zod";

export const SETTINGS_PROFILE_KEY_VALUES = [
  "ADMIN",
  "DEVELOPER",
  "SUPORTE",
  "CLIENTE_ADMIN",
  "CLIENTE_USER",
] as const;

export const SETTINGS_HIDDEN_PERMISSION_KEYS = [
  "system_team:view",
  "system_team:manage",
] as const;

export const SETTINGS_PERMISSION_DEFINITIONS = [
  { key: "dashboard:view", label: "Visualizar dashboard", module: "dashboard", description: "Acessa a visao principal do portal." },
  { key: "dashboard:stats_full", label: "Visualizar estatisticas completas", module: "dashboard", description: "Libera indicadores operacionais completos." },
  { key: "dashboard:view_daily_password", label: "Visualizar senha diaria", module: "dashboard", description: "Exibe a senha do dia calculada automaticamente no portal." },
  { key: "companies:view", label: "Visualizar lista de empresas", module: "companies", description: "Permite acessar o cadastro de empresas." },
  { key: "companies:view_all", label: "Visualizar todas as empresas", module: "companies", description: "Libera escopo global para empresas." },
  { key: "companies:view_own", label: "Visualizar empresas do proprio escopo", module: "companies", description: "Restringe a visao as empresas vinculadas." },
  { key: "companies:create", label: "Cadastrar nova empresa", module: "companies", description: "Permite abrir cadastro de nova empresa." },
  { key: "companies:edit", label: "Editar dados da empresa", module: "companies", description: "Permite alterar cadastro empresarial." },
  { key: "companies:status", label: "Ativar ou desativar empresa", module: "companies", description: "Permite alterar status operacional da empresa." },
  { key: "companies:delete", label: "Excluir empresa", module: "companies", description: "Permite excluir empresa sem vinculos operacionais." },
  { key: "contacts:view", label: "Visualizar contatos", module: "contacts", description: "Permite acessar o cadastro de contatos." },
  { key: "contacts:view_all", label: "Visualizar todos os contatos", module: "contacts", description: "Libera escopo global para contatos." },
  { key: "contacts:view_team", label: "Visualizar contatos do proprio escopo", module: "contacts", description: "Restringe a visao de contatos ao proprio escopo." },
  { key: "contacts:create", label: "Cadastrar contato", module: "contacts", description: "Permite cadastrar contatos." },
  { key: "contacts:edit", label: "Editar contato", module: "contacts", description: "Permite alterar contatos e vinculos com empresas." },
  { key: "contacts:delete", label: "Excluir contato", module: "contacts", description: "Permite excluir contatos." },
  { key: "contacts:sync", label: "Sincronizar contatos", module: "contacts", description: "Permite sincronizar contatos com integracoes externas." },
  { key: "users:view", label: "Visualizar lista de usuarios", module: "users", description: "Permite acessar a lista de usuarios." },
  { key: "users:view_all", label: "Visualizar todos os usuarios", module: "users", description: "Libera escopo global para usuarios." },
  { key: "users:view_team", label: "Visualizar equipe do proprio escopo", module: "users", description: "Restringe a visao de usuarios ao proprio escopo." },
  { key: "users:create", label: "Cadastrar ou convidar usuario", module: "users", description: "Permite criar ou convidar usuarios." },
  { key: "users:edit", label: "Editar usuario", module: "users", description: "Permite atualizar dados de usuarios." },
  { key: "users:reset_password", label: "Resetar senha de usuario", module: "users", description: "Permite acionar redefinicao de senha." },
  { key: "users:status", label: "Ativar ou desativar acesso", module: "users", description: "Permite bloquear ou reativar acesso." },
  { key: "users:view_internal", label: "Visualizar equipe interna", module: "users", description: "Permite visualizar administradores e desenvolvedores." },
  { key: "users:manage_internal", label: "Gerenciar equipe interna", module: "users", description: "Permite criar e editar perfis de sistema." },
  { key: "profile:edit_personal", label: "Alterar dados pessoais do proprio perfil", module: "profile", description: "Permite editar nome e informacoes pessoais do proprio perfil." },
  { key: "profile:edit_company", label: "Alterar dados da empresa no proprio perfil", module: "profile", description: "Permite editar os dados da empresa vinculada ao proprio acesso." },
  { key: "contracts:view", label: "Visualizar contratos", module: "contracts", description: "Permite consultar contratos." },
  { key: "contracts:create", label: "Criar contrato", module: "contracts", description: "Permite cadastrar contrato." },
  { key: "contracts:edit", label: "Editar contrato", module: "contracts", description: "Permite alterar contrato existente." },
  { key: "crm:view", label: "Visualizar CRM comercial", module: "crm", description: "Permite acessar a area comercial e o pipeline de leads." },
  { key: "crm:manage", label: "Gerenciar leads e pipeline", module: "crm", description: "Permite criar, editar e conduzir leads no CRM." },
  { key: "remote:view", label: "Visualizar infraestrutura remota", module: "remote", description: "Permite acessar hosts, sessoes e relatorios da infraestrutura remota." },
  { key: "remote:manage", label: "Gerenciar infraestrutura remota", module: "remote", description: "Permite operar hosts, sessoes e configuracoes da infraestrutura remota." },
  { key: "agents:view", label: "Visualizar dispositivos do agente", module: "agents", description: "Permite consultar a frota de agentes Trilink instalados." },
  { key: "agents:manage", label: "Gerenciar dispositivos do agente", module: "agents", description: "Permite vincular, desvincular e operar dispositivos do agente Trilink." },
  { key: "atendimento:view", label: "Acessar central de atendimento", module: "atendimento", description: "Permite abrir a central de atendimento integrada." },
  { key: "settings:view", label: "Visualizar configuracoes", module: "settings", description: "Permite acessar a area de configuracoes." },
  { key: "settings:edit", label: "Editar configuracoes", module: "settings", description: "Permite alterar configuracoes globais." },
  { key: "tools:view", label: "Acessar ferramentas", module: "tools", description: "Permite acessar o menu de ferramentas." },
  { key: "tools:all", label: "Acessar todas as ferramentas", module: "tools", description: "Libera ferramentas tecnicas completas." },
  { key: "tools:basic", label: "Acessar ferramentas basicas", module: "tools", description: "Libera somente ferramentas essenciais." },
  { key: "tickets:view_own", label: "Visualizar chamados do proprio escopo", module: "tickets", description: "Permite ver tickets vinculados ao proprio escopo." },
  { key: "tickets:view_all", label: "Visualizar todos os chamados", module: "tickets", description: "Libera visao global de tickets." },
  { key: "tickets:create", label: "Criar chamado", module: "tickets", description: "Permite abrir novo ticket." },
  { key: "tickets:manage", label: "Gerenciar chamados", module: "tickets", description: "Permite atuar operacionalmente em tickets." },
  { key: "system_team:view", label: "Visualizar equipe interna (Obsoleto)", module: "system_team", description: "Permite ver equipe interna." },
  { key: "system_team:manage", label: "Gerenciar equipe interna (Obsoleto)", module: "system_team", description: "Permite criar e editar equipe interna." },
] as const;

export const SETTINGS_PERMISSION_KEY_VALUES = SETTINGS_PERMISSION_DEFINITIONS.map((permission) => permission.key) as [
  (typeof SETTINGS_PERMISSION_DEFINITIONS)[number]["key"],
  ...(typeof SETTINGS_PERMISSION_DEFINITIONS)[number]["key"][],
];

export const settingsProfileKeySchema = z.string().trim().min(1);
export const settingsPermissionKeySchema = z.enum(SETTINGS_PERMISSION_KEY_VALUES);

export const settingsPermissionDefinitionSchema = z.object({
  key: settingsPermissionKeySchema,
  label: z.string().min(1),
  module: z.string().min(1),
  description: z.string().min(1),
});

export const settingsPermissionProfileSchema = z.object({
  key: settingsProfileKeySchema,
  label: z.string().min(1),
  permissions: z.array(settingsPermissionKeySchema),
});

export const settingsPermissionsCatalogSchema = z.object({
  matrixEnabled: z.boolean(),
  permissions: z.array(settingsPermissionDefinitionSchema),
  profiles: z.array(settingsPermissionProfileSchema),
});

export const settingsAccessScopeTypeSchema = z.enum(["GLOBAL", "COMPANY"]);

export const settingsAccessProfileSchema = z.object({
  id: z.string().min(1),
  key: settingsProfileKeySchema,
  label: z.string().min(1),
  description: z.string().optional(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  permissions: z.array(settingsPermissionKeySchema),
});

export const settingsAccessAssignmentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userEmail: z.email(),
  profileId: z.string().min(1),
  profileKey: settingsProfileKeySchema,
  profileLabel: z.string().min(1),
  scopeType: settingsAccessScopeTypeSchema,
  companyId: z.string().min(1).nullable().optional(),
  companyName: z.string().min(1).nullable().optional(),
  assignedByUserId: z.string().min(1).nullable().optional(),
  assignedByUserName: z.string().min(1).nullable().optional(),
  reason: z.string().nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
});

export const settingsAccessUserOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: z.string().min(1),
});

export const settingsAccessCompanyOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const settingsPermissionsAdminViewSchema = z.object({
  catalog: settingsPermissionsCatalogSchema,
  profiles: z.array(settingsAccessProfileSchema),
  users: z.array(settingsAccessUserOptionSchema),
  companies: z.array(settingsAccessCompanyOptionSchema),
  assignments: z.array(settingsAccessAssignmentSchema),
});

export const settingsPermissionsCatalogResponseSchema = z.object({
  success: z.boolean(),
  data: settingsPermissionsCatalogSchema.optional(),
  error: z.string().optional(),
});

export const settingsPermissionsAdminViewResponseSchema = z.object({
  success: z.boolean(),
  data: settingsPermissionsAdminViewSchema.optional(),
  error: z.string().optional(),
});

export const settingsPermissionsMatrixVisibilityUpdateSchema = z.object({
  enabled: z.boolean(),
});

export const settingsAccessProfileUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  key: settingsProfileKeySchema,
  label: z.string().min(1),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(settingsPermissionKeySchema),
});

export const settingsUserAccessProfileCreateSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  scopeType: settingsAccessScopeTypeSchema,
  companyId: z.string().min(1).optional(),
  reason: z.string().trim().optional(),
  endsAt: z.string().datetime().optional(),
});

export const settingsPermissionsMutationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type SettingsProfileKey = z.infer<typeof settingsProfileKeySchema>;
export type SettingsPermissionKey = z.infer<typeof settingsPermissionKeySchema>;
export type SettingsPermissionDefinition = z.infer<typeof settingsPermissionDefinitionSchema>;
export type SettingsPermissionProfile = z.infer<typeof settingsPermissionProfileSchema>;
export type SettingsPermissionsCatalog = z.infer<typeof settingsPermissionsCatalogSchema>;
export type SettingsPermissionsCatalogResponse = z.infer<typeof settingsPermissionsCatalogResponseSchema>;
export type SettingsAccessScopeType = z.infer<typeof settingsAccessScopeTypeSchema>;
export type SettingsAccessProfile = z.infer<typeof settingsAccessProfileSchema>;
export type SettingsAccessAssignment = z.infer<typeof settingsAccessAssignmentSchema>;
export type SettingsAccessUserOption = z.infer<typeof settingsAccessUserOptionSchema>;
export type SettingsAccessCompanyOption = z.infer<typeof settingsAccessCompanyOptionSchema>;
export type SettingsPermissionsAdminView = z.infer<typeof settingsPermissionsAdminViewSchema>;
export type SettingsPermissionsAdminViewResponse = z.infer<typeof settingsPermissionsAdminViewResponseSchema>;
export type SettingsPermissionsMatrixVisibilityUpdateInput = z.infer<typeof settingsPermissionsMatrixVisibilityUpdateSchema>;
export type SettingsAccessProfileUpsertInput = z.infer<typeof settingsAccessProfileUpsertSchema>;
export type SettingsUserAccessProfileCreateInput = z.infer<typeof settingsUserAccessProfileCreateSchema>;
export type SettingsPermissionsMutationResponse = z.infer<typeof settingsPermissionsMutationResponseSchema>;
