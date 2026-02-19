"use client"

import { useState } from "react"
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema"
import { createUserAction, linkUserToCompanyAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  UserPlus,
  Loader2,
  Link as LinkIcon,
  User,
  Mail,
  Lock,
  Briefcase,
  Phone,
  Building2,
  ShieldCheck,
  X,
  ChevronRight,
  Info,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UserContext = "SYSTEM" | "CLIENT"

interface CompanyOption {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
}

interface CreateUserDialogProps {
  companies: CompanyOption[]
  isAdmin: boolean
  context?: UserContext
}

interface LinkUserInput {
  email: string
  role: Role
  companyId: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Super Admin",
  DEVELOPER: "Desenvolvedor",
  SUPORTE: "Suporte",
  CLIENTE_ADMIN: "Gestor",
  CLIENTE_USER: "Usuário",
}

// ─── Sub-componentes de campo ─────────────────────────────────────────────────

interface RoleSelectProps {
  form: UseFormReturn<any>
  isAdmin: boolean
  context?: UserContext
}

function RoleSelect({ form, isAdmin, context }: RoleSelectProps) {
  return (
    <FormField
      control={form.control}
      name="role"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nível de Acesso</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {context !== "SYSTEM" && (
                <>
                  <SelectItem value={Role.CLIENTE_USER}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      Usuário
                    </span>
                  </SelectItem>
                  <SelectItem value={Role.CLIENTE_ADMIN}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                      Gestor
                    </span>
                  </SelectItem>
                </>
              )}
              {isAdmin && context !== "CLIENT" && (
                <>
                  {context !== "SYSTEM" && <SelectSeparator />}
                  <SelectItem value={Role.SUPORTE}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                      Suporte
                    </span>
                  </SelectItem>
                  <SelectItem value={Role.DEVELOPER}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
                      Desenvolvedor
                    </span>
                  </SelectItem>
                  <SelectItem value={Role.ADMIN}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-800 inline-block" />
                      Super Admin
                    </span>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface CompanySelectProps {
  form: UseFormReturn<any>
  isAdmin: boolean
  companies: CompanyOption[]
  context?: UserContext
}

function CompanySelect({ form, isAdmin, companies, context }: CompanySelectProps) {
  if (context === "SYSTEM") return null

  if (isAdmin) {
    return (
      <FormField
        control={form.control}
        name="companyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Empresa</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nomeFantasia || c.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <div className="space-y-2">
      <FormLabel className="text-muted-foreground">Empresa</FormLabel>
      <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted/50 flex items-center gap-2 text-muted-foreground">
        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">
          {companies[0]?.nomeFantasia || companies[0]?.razaoSocial || "Minha Empresa"}
        </span>
      </div>
    </div>
  )
}

// ─── Formulário: Criar Novo Usuário ───────────────────────────────────────────

interface CreateFormProps {
  form: UseFormReturn<CreateUserInput>
  isAdmin: boolean
  companies: CompanyOption[]
  context?: UserContext
  onCancel: () => void
}

function CreateUserForm({ form, isAdmin, companies, context, onCancel }: CreateFormProps) {
  const { isSubmitting } = form.formState

  return (
    <div className="space-y-5">
      {/* Identificação */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nome Completo <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="João da Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="joao@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Senha <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Mín. 8 caracteres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Dados profissionais */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Dados Profissionais
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Cargo / Função
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Gerente Financeiro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefone
                </FormLabel>
                <FormControl>
                  <Input placeholder="(00) 90000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Acesso */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Configuração de Acesso
        </p>
        <div className="grid grid-cols-2 gap-4">
          <RoleSelect form={form} isAdmin={isAdmin} context={context} />
          <CompanySelect form={form} isAdmin={isAdmin} companies={companies} context={context} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px] font-semibold">
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
          ) : (
            <><UserPlus className="mr-2 h-4 w-4" /> Cadastrar</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Formulário: Vincular Usuário Existente ───────────────────────────────────

interface LinkFormProps {
  form: UseFormReturn<LinkUserInput>
  isAdmin: boolean
  companies: CompanyOption[]
  context?: UserContext
  onCancel: () => void
}

function LinkUserForm({ form, isAdmin, companies, context, onCancel }: LinkFormProps) {
  const { isSubmitting } = form.formState

  return (
    <div className="space-y-5">
      {/* Info box */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Vincule um usuário que já possui conta na plataforma — por exemplo, um colaborador de uma empresa matriz ou filial.
        </p>
      </div>

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> E-mail do Usuário
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="usuario@existente.com"
                {...field}
              />
            </FormControl>
            <FormDescription>
              O usuário receberá acesso à empresa selecionada com o nível definido abaixo.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <RoleSelect form={form} isAdmin={isAdmin} context={context} />
        <CompanySelect form={form} isAdmin={isAdmin} companies={companies} context={context} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="secondary"
          disabled={isSubmitting}
          className="min-w-[120px] font-semibold gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Vinculando...</>
          ) : (
            <><LinkIcon className="h-4 w-4" /> Vincular</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Tab Selector ─────────────────────────────────────────────────────────────

type TabMode = "create" | "link"

interface TabSelectorProps {
  active: TabMode
  onChange: (tab: TabMode) => void
}

function TabSelector({ active, onChange }: TabSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/40">
      {(["create", "link"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
            active === tab
              ? "bg-background shadow-sm text-foreground border border-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab === "create" ? (
            <><UserPlus className="w-3.5 h-3.5" /> Criar Novo</>
          ) : (
            <><LinkIcon className="w-3.5 h-3.5" /> Vincular Existente</>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function CreateUserDialog({ companies, isAdmin, context }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabMode>("create")

  const defaultCompanyId = !isAdmin && companies.length > 0 ? companies[0].id : ""
  const defaultRole = context === "SYSTEM" ? Role.SUPORTE : Role.CLIENTE_USER

  const formCreate = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      companyId: defaultCompanyId,
      jobTitle: "",
      phone: "",
      cpf: "",
    },
  })

  const formLink = useForm<LinkUserInput>({
    defaultValues: {
      email: "",
      role: defaultRole,
      companyId: defaultCompanyId,
    },
  })

  const handleClose = () => {
    setOpen(false)
    setActiveTab("create")
    formCreate.reset()
    formLink.reset()
  }

  const onSubmitCreate: SubmitHandler<CreateUserInput> = async (data) => {
    if (!isAdmin && defaultCompanyId) data.companyId = defaultCompanyId
    if (context === "SYSTEM") data.companyId = undefined

    const result = await createUserAction(data)

    if (result.success) {
      toast.success(result.message ?? "Usuário criado com sucesso!")
      handleClose()
    } else {
      toast.error(typeof result.errors === "string" ? result.errors : "Erro ao criar usuário.")
    }
  }

  const onSubmitLink = async (data: LinkUserInput) => {
    if (!isAdmin && defaultCompanyId) data.companyId = defaultCompanyId

    if (!data.companyId && context !== "SYSTEM") {
      toast.error("Selecione uma empresa para vincular o usuário.")
      return
    }

    const result = await linkUserToCompanyAction(data)

    if (result.success) {
      toast.success(result.message ?? "Usuário vinculado com sucesso!")
      handleClose()
    } else {
      toast.error(typeof result.errors === "string" ? result.errors : "Erro ao vincular usuário.")
    }
  }

  const triggerLabel =
    context === "SYSTEM"
      ? "Novo Administrador"
      : isAdmin
        ? "Gerenciar Usuário"
        : "Convidar Membro"

  const isSystemContext = context === "SYSTEM"

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold",
          "bg-primary text-primary-foreground shadow-sm",
          "hover:bg-primary/90 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {isSystemContext ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {triggerLabel}
      </button>

      <DialogContent
        className="p-0 gap-0 flex flex-col sm:max-w-[580px] max-h-[92vh] border-border/60 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <DialogHeader className="flex-none px-6 py-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {isSystemContext ? (
                  <ShieldCheck className="w-5 h-5 text-primary" />
                ) : (
                  <UserPlus className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight leading-tight">
                  {isSystemContext ? "Novo Membro da Equipe" : "Gerenciar Acesso"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSystemContext
                    ? "Adicione um administrador, dev ou suporte"
                    : "Crie um novo usuário ou vincule um existente"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Tab selector — só para contexto CLIENT */}
          {!isSystemContext && (
            <TabSelector active={activeTab} onChange={setActiveTab} />
          )}

          {/* Criar novo — sempre visível no contexto SYSTEM */}
          {(isSystemContext || activeTab === "create") && (
            <Form {...formCreate}>
              <form onSubmit={formCreate.handleSubmit(onSubmitCreate)}>
                <CreateUserForm
                  form={formCreate}
                  isAdmin={isAdmin}
                  companies={companies}
                  context={context}
                  onCancel={handleClose}
                />
              </form>
            </Form>
          )}

          {/* Vincular existente — só contexto CLIENT */}
          {!isSystemContext && activeTab === "link" && (
            <Form {...formLink}>
              <form onSubmit={formLink.handleSubmit(onSubmitLink)}>
                <LinkUserForm
                  form={formLink}
                  isAdmin={isAdmin}
                  companies={companies}
                  context={context}
                  onCancel={handleClose}
                />
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}