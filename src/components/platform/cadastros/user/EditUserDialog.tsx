"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema"
import { updateUserAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatPhone } from "@/lib/formatters"

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
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Save,
  User,
  Building2,
  Briefcase,
  Phone,
  Fingerprint,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  ChevronRight,
  AlertCircle,
  PenLine,
} from "lucide-react"
import { UserMembershipsList } from "./UserMembershipsList"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CompanyOption {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  [key: string]: any
}

interface UserMembership {
  companyId: string
  role: Role
  [key: string]: any
}

interface UserData {
  id: string
  name: string | null
  email: string
  role: Role
  jobTitle: string | null
  phone: string | null
  cpf: string | null
  memberships: UserMembership[]
  [key: string]: any
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserData
  companies: CompanyOption[]
  isAdmin: boolean
}

type SectionId = "dados" | "vinculos"

interface Section {
  id: SectionId
  label: string
  description: string
  icon: React.ElementType
  systemOnly?: false
  clientOnly?: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]

const SECTIONS: Section[] = [
  {
    id: "dados",
    label: "Dados Pessoais",
    description: "Perfil e credenciais",
    icon: User,
  },
  {
    id: "vinculos",
    label: "Empresas e Acessos",
    description: "Vínculos e permissões",
    icon: Building2,
    clientOnly: true,
  },
]

// ─── Sub-componente: Nav Item ─────────────────────────────────────────────────

interface NavItemProps {
  section: Section
  isCurrent: boolean
  hasErrors: boolean
  isDirty: boolean
  onClick: () => void
}

function NavItem({ section, isCurrent, hasErrors, isDirty, onClick }: NavItemProps) {
  const Icon = section.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
        isCurrent && "bg-primary/8 dark:bg-primary/10",
        !isCurrent && "hover:bg-muted/60",
      )}
    >
      <div
        className={cn(
          "mt-0.5 p-1.5 rounded-md flex-shrink-0 transition-colors",
          isCurrent
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-muted/80",
          hasErrors && "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-medium leading-tight truncate",
              isCurrent ? "text-primary" : "text-foreground",
              hasErrors && "text-destructive",
            )}
          >
            {section.label}
          </p>
          {isDirty && !hasErrors && (
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
          {hasErrors && (
            <AlertCircle className="flex-shrink-0 w-3.5 h-3.5 text-destructive" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
          {section.description}
        </p>
      </div>

      {isCurrent && (
        <ChevronRight className="w-3.5 h-3.5 text-primary/60 ml-auto mt-1 flex-shrink-0" />
      )}
    </button>
  )
}

// ─── Sub-componente: System Role Badge ───────────────────────────────────────

function SystemRoleBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
      <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
        Acesso Administrativo
      </span>
    </div>
  )
}

// ─── Sub-componente: Dados Pessoais ──────────────────────────────────────────

interface UserFieldsProps {
  form: UseFormReturn<CreateUserInput>
  isSystemUser: boolean
}

function UserFields({ form, isSystemUser }: UserFieldsProps) {
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
                <User className="w-3.5 h-3.5" /> Nome Completo
              </FormLabel>
              <FormControl>
                <Input placeholder="Ex: João Silva" {...field} value={field.value ?? ""} />
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
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" /> CPF
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="000.000.000-00"
                    maxLength={14}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Cargo
                </FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
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
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Role — somente para usuários de sistema */}
      {isSystemUser && (
        <>
          <Separator />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50">
                <FormLabel className="text-purple-700 dark:text-purple-300 font-semibold text-sm">
                  Nível de Acesso
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={Role.SUPORTE}>
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                        Suporte Técnico
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
                        Super Administrador
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  )
}

// ─── Sub-componente: Alterar Senha ────────────────────────────────────────────

interface PasswordChangeSectionProps {
  form: UseFormReturn<CreateUserInput>
  isAdmin: boolean
}

function PasswordChangeSection({ form, isAdmin }: PasswordChangeSectionProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  if (!isAdmin) return null

  const startChanging = () => {
    setIsChanging(true)
    form.setValue("password", "")
  }

  const cancelChanging = () => {
    setIsChanging(false)
    setIsVisible(false)
    form.setValue("password", "placeholder")
    form.clearErrors("password")
  }

  return (
    <div className="pt-4 border-t border-dashed">
      {!isChanging ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-orange-600 hover:border-orange-300 transition-colors"
          onClick={startChanging}
        >
          <Lock className="w-3.5 h-3.5" />
          Alterar Senha de Acesso
        </Button>
      ) : (
        <div className="space-y-3 p-4 bg-orange-50/60 dark:bg-orange-950/10 rounded-xl border border-orange-200 dark:border-orange-900/30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Nova Senha
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400"
              onClick={cancelChanging}
            >
              Cancelar
            </Button>
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={isVisible ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-background pr-10 focus-visible:ring-orange-500"
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsVisible((v) => !v)}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  companies,
  isAdmin,
}: EditUserDialogProps) {
  const [currentSection, setCurrentSection] = useState<SectionId>("dados")

  const isSystemUser = SYSTEM_ROLES.includes(user?.role)

  // Filtra seções disponíveis conforme o tipo de usuário
  const availableSections = SECTIONS.filter(
    (s) => !s.clientOnly || !isSystemUser,
  )

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      password: "placeholder",
      role: Role.CLIENTE_USER,
      companyId: "",
      jobTitle: "",
      phone: "",
      cpf: "",
    },
    mode: "onTouched",
  })

  const { isSubmitting, errors, dirtyFields } = form.formState

  useEffect(() => {
    if (user && open) {
      form.reset({
        name: user.name ?? "",
        email: user.email,
        password: "placeholder",
        role: user.role,
        companyId: user.memberships?.[0]?.companyId ?? "",
        jobTitle: user.jobTitle ?? "",
        phone: user.phone ?? "",
        cpf: user.cpf ?? "",
      })
      setCurrentSection("dados")
    }
  }, [user, open, form])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setCurrentSection("dados")
  }, [onOpenChange])

  // Dirty tracking por seção
  const sectionIsDirty = useCallback(
    (section: Section): boolean => {
      const fieldMap: Record<SectionId, (keyof CreateUserInput)[]> = {
        dados: ["name", "email", "cpf", "jobTitle", "phone", "role", "password"],
        vinculos: ["companyId"],
      }
      return fieldMap[section.id].some((f) => !!dirtyFields[f])
    },
    [dirtyFields],
  )

  // Error tracking por seção
  const sectionHasErrors = useCallback(
    (section: Section): boolean => {
      const fieldMap: Record<SectionId, (keyof CreateUserInput)[]> = {
        dados: ["name", "email", "cpf", "jobTitle", "phone", "role", "password"],
        vinculos: ["companyId"],
      }
      return fieldMap[section.id].some((f) => !!errors[f])
    },
    [errors],
  )

  const totalDirtySections = availableSections.filter(sectionIsDirty).length

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    if (!user) return

    try {
      const result = await updateUserAction(user.id, data)

      if (result.success) {
        toast.success(result.message ?? "Usuário atualizado com sucesso!")
        handleClose()
      } else {
        if (result.errors) {
          Object.entries(result.errors).forEach(([key, messages]) => {
            form.setError(key as keyof CreateUserInput, {
              type: "manual",
              message: (messages as string[])[0],
            })
          })
        }
        toast.error(result.message ?? "Erro ao atualizar usuário.")
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.")
    }
  }

  const displayName = user?.name || user?.email || "Usuário"

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : undefined)}>
      <DialogContent
        className={cn(
          "p-0 gap-0 flex flex-col overflow-hidden",
          "sm:max-w-[720px] max-h-[92vh]",
          "border-border/60 shadow-2xl",
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <DialogHeader className="flex-none px-6 py-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PenLine className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight leading-tight">
                  Editar Usuário
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                  {displayName}
                  {user?.email && user?.name && (
                    <span className="text-muted-foreground/50 ml-1.5">
                      — {user.email}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalDirtySections > 0 && (
                <Badge
                  variant="outline"
                  className="text-[11px] gap-1.5 text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  {totalDirtySections}{" "}
                  {totalDirtySections === 1 ? "seção alterada" : "seções alteradas"}
                </Badge>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Nav */}
          <nav className="flex-none w-48 border-r bg-muted/20 p-3 space-y-0.5 overflow-y-auto">
            {/* Badge de contexto sistema */}
            {isSystemUser && (
              <div className="mb-3">
                <SystemRoleBadge />
              </div>
            )}

            {availableSections.map((section) => (
              <NavItem
                key={section.id}
                section={section}
                isCurrent={currentSection === section.id}
                hasErrors={sectionHasErrors(section)}
                isDirty={sectionIsDirty(section)}
                onClick={() => setCurrentSection(section.id)}
              />
            ))}
          </nav>

          {/* Conteúdo da seção */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 flex flex-col min-w-0"
            >
              <div className="flex-1 overflow-y-auto p-6">
                {currentSection === "dados" && (
                  <div className="space-y-5 animate-in fade-in-50 duration-200">
                    <UserFields form={form} isSystemUser={isSystemUser} />
                    <PasswordChangeSection form={form} isAdmin={isAdmin} />
                  </div>
                )}

                {currentSection === "vinculos" && !isSystemUser && (
                  <div className="animate-in fade-in-50 duration-200">
                    <UserMembershipsList
                      userId={user?.id}
                      userEmail={user?.email}
                      memberships={(user?.memberships ?? []) as any[]}
                      companies={companies as any[]}
                    />
                  </div>
                )}
              </div>

              {/* ── Footer ─────────────────────────────────────────── */}
              <div className="flex-none px-6 py-4 border-t bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {Object.keys(errors).length > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[11px] gap-1 font-medium"
                    >
                      <AlertCircle className="w-3 h-3" />
                      Campos inválidos
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !form.formState.isDirty}
                    className="min-w-[160px] font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}