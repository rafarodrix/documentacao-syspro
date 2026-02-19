"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { updateCompanyAction } from "@/actions/admin/company-actions"
import { TaxRegime, IndicadorIE, CompanyStatus } from "@prisma/client"
import { toast } from "sonner"
import { formatCNPJ, formatPhone } from "@/lib/formatters"
import { useAddressLookup } from "@/hooks/use-address-lookup"
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
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  MapPin,
  FileText,
  Phone as PhoneIcon,
  Globe,
  Mail,
  Landmark,
  Calendar,
  Hash,
  AlertCircle,
  Loader2,
  Save,
  ChevronRight,
  X,
  Image as ImageIcon,
  Search,
  PenLine,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Idealmente: Company & { addresses: Address[] }
type CompanyData = Record<string, any>

type SectionId = "geral" | "fiscal" | "estrutura" | "endereco" | "contato"

interface Section {
  id: SectionId
  label: string
  description: string
  icon: React.ElementType
  fields: string[]
}

interface EditCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: CompanyData
}

// ─── Configuração das Seções ──────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "geral",
    label: "Identificação",
    description: "Dados cadastrais",
    icon: Building2,
    fields: ["cnpj", "razaoSocial", "nomeFantasia", "logoUrl", "dataFundacao", "status"],
  },
  {
    id: "fiscal",
    label: "Fiscal",
    description: "Regime e registros",
    icon: FileText,
    fields: ["regimeTributario", "crt", "indicadorIE", "inscricaoEstadual", "inscricaoMunicipal", "cnae", "codSuframa"],
  },
  {
    id: "estrutura",
    label: "Estrutura",
    description: "Hierarquia corporativa",
    icon: Landmark,
    fields: ["parentCompanyId", "accountingFirmId"],
  },
  {
    id: "endereco",
    label: "Endereço",
    description: "Localização e IBGE",
    icon: MapPin,
    fields: ["address.cep", "address.logradouro", "address.numero", "address.bairro", "address.cidade", "address.estado", "address.codigoIbgeCidade", "address.codigoIbgeEstado"],
  },
  {
    id: "contato",
    label: "Contato",
    description: "Canais de comunicação",
    icon: PhoneIcon,
    fields: ["emailContato", "emailFinanceiro", "telefone", "website", "observacoes"],
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
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Alterações não salvas" />
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

// ─── Sub-componente: Section Header ──────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="p-2 rounded-md bg-primary/8 dark:bg-primary/10 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function Required() {
  return <span className="text-destructive ml-0.5">*</span>
}

// ─── Seções de Formulário ─────────────────────────────────────────────────────

interface SectionProps {
  form: ReturnType<typeof useForm<CreateCompanyInput>>
  isLoadingCep?: boolean
  handleCepChange?: (value: string) => void
}

function GeralSection({ form }: SectionProps) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Building2}
        title="Identificação da Empresa"
        description="Dados jurídicos e comerciais do CNPJ"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ <Required /></FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                  maxLength={18}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dataFundacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data de Fundação
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={
                    field.value instanceof Date
                      ? field.value.toISOString().split("T")[0]
                      : (field.value as string) ?? ""
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="razaoSocial"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Razão Social <Required /></FormLabel>
            <FormControl>
              <Input
                {...field}
                value={(field.value as string) ?? ""}
                className="font-medium"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="nomeFantasia"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome Fantasia</FormLabel>
            <FormControl>
              <Input {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value as string}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={CompanyStatus.ACTIVE}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Ativo
                    </span>
                  </SelectItem>
                  <SelectItem value={CompanyStatus.INACTIVE}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
                      Inativo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> URL da Logo
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://..."
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function FiscalSection({ form }: SectionProps) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={FileText}
        title="Dados Fiscais"
        description="Regime tributário, ICMS e registros estaduais/municipais"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="regimeTributario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regime Tributário</FormLabel>
              <Select onValueChange={field.onChange} value={(field.value as string) ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(TaxRegime).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="crt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CRT</FormLabel>
              <Select onValueChange={field.onChange} value={(field.value as string) ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Código de Regime..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 — Simples Nacional</SelectItem>
                  <SelectItem value="2">2 — Simples (Excesso de Sublimite)</SelectItem>
                  <SelectItem value="3">3 — Regime Normal</SelectItem>
                  <SelectItem value="4">4 — Simples Nacional (MEI)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="indicadorIE"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contribuinte ICMS</FormLabel>
              <Select onValueChange={field.onChange} value={field.value as string}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={IndicadorIE.CONTRIBUINTE}>Contribuinte</SelectItem>
                  <SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>Não Contribuinte</SelectItem>
                  <SelectItem value={IndicadorIE.ISENTO}>Isento</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inscricaoEstadual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inscrição Estadual</FormLabel>
              <FormControl>
                <Input placeholder="IE" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inscricaoMunicipal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inscrição Municipal</FormLabel>
              <FormControl>
                <Input placeholder="IM" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cnae"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNAE Principal</FormLabel>
              <FormControl>
                <Input placeholder="0000-0/00" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormDescription>Atividade econômica principal</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="codSuframa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código SUFRAMA</FormLabel>
              <FormControl>
                <Input placeholder="Zona Franca de Manaus" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function EstruturaSection({ form }: SectionProps) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Landmark}
        title="Estrutura Corporativa"
        description="Hierarquia, vínculos e responsabilidade contábil"
      />

      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Alterar os vínculos abaixo pode impactar relatórios consolidados e a escrituração contábil vigente.
        </p>
      </div>

      <FormField
        control={form.control}
        name="parentCompanyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Empresa Matriz</FormLabel>
            <FormControl>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/50" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empresa matriz pelo nome ou CNPJ..."
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              </div>
            </FormControl>
            <FormDescription>Preencha apenas se esta é uma filial ou subsidiária</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="accountingFirmId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Escritório Contábil</FormLabel>
            <FormControl>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/50" />
                <Input
                  className="pl-9"
                  placeholder="Buscar escritório contábil..."
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              </div>
            </FormControl>
            <FormDescription>Responsável pela escrituração fiscal e contábil</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function EnderecoSection({ form, isLoadingCep, handleCepChange }: SectionProps) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={MapPin}
        title="Endereço Sede"
        description="Localização principal para emissão de documentos fiscais"
      />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="address.cep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP <Required /></FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="00000-000"
                    maxLength={9}
                    {...field}
                    value={(field.value as string) ?? ""}
                    onChange={(e) => handleCepChange?.(e.target.value)}
                    disabled={isLoadingCep}
                  />
                </FormControl>
                {isLoadingCep && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-2">
          <FormField
            control={form.control}
            name="address.logradouro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logradouro <Required /></FormLabel>
                <FormControl>
                  <Input {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="address.numero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número <Required /></FormLabel>
              <FormControl>
                <Input placeholder="Nº" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-3">
          <FormField
            control={form.control}
            name="address.complemento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Sala, Andar, Bloco..." {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="address.bairro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bairro <Required /></FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address.cidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade <Required /></FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address.estado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UF <Required /></FormLabel>
              <FormControl>
                <Input
                  maxLength={2}
                  className="uppercase"
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Códigos IBGE (Obrigatório para NF-e)
        </p>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <FormField
            control={form.control}
            name="address.codigoIbgeCidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Código IBGE da Cidade
                </FormLabel>
                <FormControl>
                  <Input placeholder="0000000" {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address.codigoIbgeEstado"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Código IBGE do Estado
                </FormLabel>
                <FormControl>
                  <Input placeholder="00" {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )
}

function ContatoSection({ form }: SectionProps) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={PhoneIcon}
        title="Canais de Contato"
        description="E-mails, telefone e presença digital"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="emailContato"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail Comercial
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder="comercial@empresa.com.br" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emailFinanceiro"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail Financeiro
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder="financeiro@empresa.com.br" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5" /> Telefone
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="(00) 0000-0000"
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Website
              </FormLabel>
              <FormControl>
                <Input placeholder="https://www.empresa.com.br" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="observacoes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Internas</FormLabel>
            <FormControl>
              <Textarea
                className="resize-none min-h-[100px]"
                placeholder="Notas internas visíveis apenas para administradores..."
                {...field}
                value={(field.value as string) ?? ""}
              />
            </FormControl>
            <FormDescription>
              Não aparece em documentos fiscais nem relatórios externos
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function EditCompanyDialog({ open, onOpenChange, company }: EditCompanyDialogProps) {
  const [currentSection, setCurrentSection] = useState<SectionId>("geral")

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema) as any,
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      address: {
        description: "Sede",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        pais: "BR",
        codigoIbgeCidade: "",
        codigoIbgeEstado: "",
      },
    },
    mode: "onTouched",
  })

  const { isSubmitting, errors, dirtyFields } = form.formState
  const { isLoadingCep, handleCepChange } = useAddressLookup(form.setValue)

  // Sincroniza dados da empresa ao abrir
  useEffect(() => {
    if (company && open) {
      const mainAddress = company.addresses?.[0] ?? company.address ?? {}

      form.reset({
        cnpj: formatCNPJ(company.cnpj ?? ""),
        razaoSocial: company.razaoSocial ?? "",
        nomeFantasia: company.nomeFantasia ?? "",
        logoUrl: company.logoUrl ?? "",
        status: company.status ?? CompanyStatus.ACTIVE,
        indicadorIE: company.indicadorIE ?? IndicadorIE.NAO_CONTRIBUINTE,
        regimeTributario: company.regimeTributario ?? undefined,
        inscricaoEstadual: company.inscricaoEstadual ?? "",
        inscricaoMunicipal: company.inscricaoMunicipal ?? "",
        crt: company.crt ?? "",
        cnae: company.cnae ?? "",
        codSuframa: company.codSuframa ?? "",
        dataFundacao: company.dataFundacao ? new Date(company.dataFundacao) : undefined,
        emailContato: company.emailContato ?? "",
        emailFinanceiro: company.emailFinanceiro ?? "",
        telefone: company.telefone ?? "",
        website: company.website ?? "",
        observacoes: company.observacoes ?? "",
        parentCompanyId: company.parentCompanyId ?? "",
        accountingFirmId: company.accountingFirmId ?? "",
        address: {
          description: mainAddress.description ?? "Sede",
          cep: mainAddress.cep ?? "",
          logradouro: mainAddress.logradouro ?? "",
          numero: mainAddress.numero ?? "",
          complemento: mainAddress.complemento ?? "",
          bairro: mainAddress.bairro ?? "",
          cidade: mainAddress.cidade ?? mainAddress.city ?? "",
          estado: mainAddress.estado ?? mainAddress.state ?? "",
          pais: mainAddress.pais ?? "BR",
          codigoIbgeCidade: mainAddress.codigoIbgeCidade ?? "",
          codigoIbgeEstado: mainAddress.codigoIbgeEstado ?? "",
        },
      })
    }
  }, [company, open, form])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setCurrentSection("geral")
  }, [onOpenChange])

  // Verifica se uma seção tem erros de validação
  const sectionHasErrors = useCallback(
    (section: Section): boolean =>
      section.fields.some((f) => {
        const parts = f.split(".")
        let obj: Record<string, unknown> = errors as Record<string, unknown>
        for (const part of parts) {
          if (!obj || typeof obj !== "object") return false
          obj = (obj as Record<string, unknown>)[part] as Record<string, unknown>
        }
        return !!obj
      }),
    [errors],
  )

  // Verifica se uma seção tem campos alterados (dirty)
  const sectionIsDirty = useCallback(
    (section: Section): boolean =>
      section.fields.some((f) => {
        const parts = f.split(".")
        let obj: Record<string, unknown> = dirtyFields as Record<string, unknown>
        for (const part of parts) {
          if (!obj || typeof obj !== "object") return false
          obj = (obj as Record<string, unknown>)[part] as Record<string, unknown>
        }
        return !!obj
      }),
    [dirtyFields],
  )

  const totalDirtySections = SECTIONS.filter(sectionIsDirty).length

  const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
    if (!company?.id) return

    try {
      const result = await updateCompanyAction(company.id, data)

      if (result.success) {
        toast.success("Empresa atualizada com sucesso!")
        handleClose()
      } else if (result.errors) {
        Object.entries(result.errors).forEach(([key, messages]) => {
          form.setError(key as any, { type: "manual", message: messages[0] })
        })
        toast.error("Corrija os campos destacados antes de salvar.")
      } else {
        toast.error(result.message ?? "Erro ao atualizar empresa.")
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.")
    }
  }

  const sectionProps: SectionProps = { form, isLoadingCep, handleCepChange }

  const sections: Record<SectionId, React.ReactNode> = {
    geral: <GeralSection {...sectionProps} />,
    fiscal: <FiscalSection {...sectionProps} />,
    estrutura: <EstruturaSection {...sectionProps} />,
    endereco: <EnderecoSection {...sectionProps} />,
    contato: <ContatoSection {...sectionProps} />,
  }

  const companyName = company?.nomeFantasia || company?.razaoSocial || "Empresa"

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : undefined)}>
      <DialogContent
        className={cn(
          "p-0 gap-0 flex flex-col overflow-hidden",
          "sm:max-w-[860px] max-h-[92vh]",
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
                  Editar Empresa
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">
                  {companyName}
                  {company?.cnpj && (
                    <span className="text-muted-foreground/50 ml-1.5">
                      — {formatCNPJ(company.cnpj)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalDirtySections > 0 && (
                <Badge variant="outline" className="text-[11px] gap-1.5 text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  {totalDirtySections} {totalDirtySections === 1 ? "seção alterada" : "seções alteradas"}
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
          <nav className="flex-none w-52 border-r bg-muted/20 p-3 space-y-0.5 overflow-y-auto">
            {SECTIONS.map((section) => (
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
                {sections[currentSection]}
              </div>

              {/* ── Footer ─────────────────────────────────────────── */}
              <div className="flex-none px-6 py-4 border-t bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {Object.keys(errors).length > 0 && (
                    <Badge variant="destructive" className="text-[11px] gap-1 font-medium">
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