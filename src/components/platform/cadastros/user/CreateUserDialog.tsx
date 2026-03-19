"use client"

import { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, type CreateUserInput } from "@/core/application/schema/user-schema"
import { createUserAction, linkUserToCompanyAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UserPlus, Loader2, Link as LinkIcon, User, Mail, Lock, Briefcase, Phone, Building2, ShieldCheck, X, Info } from "lucide-react"

type UserContext = "SYSTEM" | "CLIENT"
type TabMode = "create" | "link"

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

interface RoleSelectProps {
  value: string
  onChange: (value: string) => void
  isAdmin: boolean
  context?: UserContext
}

function RoleSelect({ value, onChange, isAdmin, context }: RoleSelectProps) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent>
        {context !== "SYSTEM" && (
          <>
            <SelectItem value={Role.CLIENTE_USER}>Usuario</SelectItem>
            <SelectItem value={Role.CLIENTE_ADMIN}>Gestor</SelectItem>
          </>
        )}

        {isAdmin && context !== "CLIENT" && (
          <>
            {context !== "SYSTEM" && <SelectSeparator />}
            <SelectItem value={Role.SUPORTE}>Suporte</SelectItem>
            <SelectItem value={Role.DEVELOPER}>Desenvolvedor</SelectItem>
            <SelectItem value={Role.ADMIN}>Super Admin</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  )
}

function CompanyField({
  value,
  onChange,
  companies,
  context,
}: {
  value: string
  onChange: (value: string) => void
  companies: CompanyOption[]
  context?: UserContext
}) {
  if (context === "SYSTEM") return null

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione a empresa" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.nomeFantasia || company.razaoSocial}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TabSelector({ active, onChange }: { active: TabMode; onChange: (tab: TabMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/40">
      {( ["create", "link"] as const).map((tab) => (
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
            <><UserPlus className="w-3.5 h-3.5" /> Novo usuario</>
          ) : (
            <><LinkIcon className="w-3.5 h-3.5" /> Vincular usuario</>
          )}
        </button>
      ))}
    </div>
  )
}

export function CreateUserDialog({ companies, isAdmin, context = "CLIENT" }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabMode>("create")

  const defaultCompanyId = context !== "SYSTEM" && companies.length > 0 ? companies[0].id : ""
  const defaultRole = context === "SYSTEM" ? Role.SUPORTE : Role.CLIENTE_USER

  const formCreate = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      companyId: isAdmin ? "" : defaultCompanyId,
      jobTitle: "",
      phone: "",
      cpf: "",
    },
  })

  const formLink = useForm<LinkUserInput>({
    defaultValues: {
      email: "",
      role: defaultRole,
      companyId: isAdmin ? "" : defaultCompanyId,
    },
  })

  const selectedCompany = formCreate.watch("companyId")
  const mustChooseCompanyFirst = context === "CLIENT" && isAdmin && !selectedCompany

  const closeDialog = () => {
    setOpen(false)
    setActiveTab("create")
    formCreate.reset()
    formLink.reset()
  }

  const submitCreate: SubmitHandler<CreateUserInput> = async (data) => {
    if (context === "SYSTEM") {
      data.companyId = undefined
    }

    if (context === "CLIENT" && !data.companyId) {
      toast.error("Selecione a empresa antes de cadastrar o usuario.")
      return
    }

    const result = await createUserAction(data)
    if (result.success) {
      toast.success(result.message ?? "Usuario criado com sucesso")
      closeDialog()
    } else {
      toast.error(result.message ?? "Erro ao criar usuario")
    }
  }

  const submitLink = async (data: LinkUserInput) => {
    if (context === "CLIENT" && !data.companyId) {
      toast.error("Selecione a empresa antes de vincular o usuario.")
      return
    }

    const result = await linkUserToCompanyAction(data)
    if (result.success) {
      toast.success(result.message ?? "Usuario vinculado com sucesso")
      closeDialog()
    } else {
      toast.error(result.message ?? "Erro ao vincular usuario")
    }
  }

  const triggerLabel = context === "SYSTEM" ? "Novo membro interno" : "Novo usuario"

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : closeDialog())}>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        {context === "SYSTEM" ? <ShieldCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {triggerLabel}
      </button>

      <DialogContent className="p-0 gap-0 flex flex-col sm:max-w-[620px] max-h-[92vh] border-border/60 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-none px-6 py-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {context === "SYSTEM" ? <ShieldCheck className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight leading-tight">
                  {context === "SYSTEM" ? "Novo membro da equipe" : "Novo usuario"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {context === "SYSTEM" ? "Cadastro da equipe interna" : "Selecione empresa e conclua o cadastro"}
                </p>
              </div>
            </div>
            <button type="button" onClick={closeDialog} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {context !== "SYSTEM" && <TabSelector active={activeTab} onChange={setActiveTab} />}

          {(context === "SYSTEM" || activeTab === "create") && (
            <Form {...formCreate}>
              <form onSubmit={formCreate.handleSubmit(submitCreate)} className="space-y-5">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">1. Empresa e acesso</p>

                  <FormField
                    control={formCreate.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Empresa</FormLabel>
                        <FormControl>
                          <CompanyField value={field.value || ""} onChange={field.onChange} companies={companies} context={context} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={formCreate.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel de acesso</FormLabel>
                        <FormControl>
                          <RoleSelect value={field.value} onChange={field.onChange} isAdmin={isAdmin} context={context} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {mustChooseCompanyFirst && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      Selecione a empresa para liberar os campos de cadastro do usuario.
                    </p>
                  </div>
                )}

                <div className={cn("space-y-5", mustChooseCompanyFirst && "opacity-60 pointer-events-none")}>
                  <Separator />

                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2. Dados do usuario</p>

                    <FormField
                      control={formCreate.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nome completo</FormLabel>
                          <FormControl><Input placeholder="Joao da Silva" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={formCreate.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> E-mail</FormLabel>
                            <FormControl><Input type="email" placeholder="usuario@empresa.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={formCreate.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Senha</FormLabel>
                            <FormControl><Input type="password" placeholder="Min. 8 caracteres" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={formCreate.control}
                        name="jobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Cargo</FormLabel>
                            <FormControl><Input placeholder="Ex: Financeiro" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={formCreate.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Telefone</FormLabel>
                            <FormControl><Input placeholder="(00) 90000-0000" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeDialog} disabled={formCreate.formState.isSubmitting}>Cancelar</Button>
                  <Button type="submit" disabled={formCreate.formState.isSubmitting || mustChooseCompanyFirst} className="min-w-[120px] font-semibold">
                    {formCreate.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><UserPlus className="mr-2 h-4 w-4" /> Cadastrar usuario</>}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {context !== "SYSTEM" && activeTab === "link" && (
            <Form {...formLink}>
              <form onSubmit={formLink.handleSubmit(submitLink)} className="space-y-5">
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Vincule um usuario que ja possui conta na plataforma.
                  </p>
                </div>

                <FormField
                  control={formLink.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <CompanyField value={field.value || ""} onChange={field.onChange} companies={companies} context={context} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formLink.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail do usuario</FormLabel>
                      <FormControl><Input type="email" placeholder="usuario@existente.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formLink.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel de acesso</FormLabel>
                      <FormControl>
                        <RoleSelect value={field.value} onChange={field.onChange} isAdmin={isAdmin} context={context} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeDialog} disabled={formLink.formState.isSubmitting}>Cancelar</Button>
                  <Button type="submit" variant="secondary" disabled={formLink.formState.isSubmitting} className="min-w-[120px] font-semibold gap-2">
                    {formLink.formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Vinculando...</> : <><LinkIcon className="h-4 w-4" /> Vincular usuario</>}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
