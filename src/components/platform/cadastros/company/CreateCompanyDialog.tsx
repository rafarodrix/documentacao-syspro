"use client"

import { useState, useCallback } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema"
import { createCompanyAction } from "@/actions/admin/company-actions"
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
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Plus,
  ChevronRight,
  ChevronLeft,
  X,
  Image as ImageIcon,
  Search,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StepId = "geral" | "fiscal" | "estrutura" | "endereco" | "contato"

interface Step {
  id: StepId
  label: string
  description: string
  icon: React.ElementType
  fields: (keyof CreateCompanyInput | string)[]
  required?: boolean
}

// ─── Configuração dos Steps ───────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: "geral",
    label: "Identificação",
    description: "Dados cadastrais básicos",
    icon: Building2,
    fields: ["cnpj", "razaoSocial", "nomeFantasia", "logoUrl", "dataFundacao"],
    required: true,
  },
  {
    id: "fiscal",
    label: "Fiscal",
    description: "Regime tributário e registros",
    icon: FileText,
    fields: ["regimeTributario", "crt", "indicadorIE", "inscricaoEstadual", "inscricaoMunicipal", "cnae"],
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
    description: "Localização e códigos IBGE",
    icon: MapPin,
    fields: ["address.cep", "address.logradouro", "address.numero", "address.bairro", "address.cidade", "address.estado"],
    required: true,
  },
  {
    id: "contato",
    label: "Contato",
    description: "Canais de comunicação",
    icon: PhoneIcon,
    fields: ["emailContato", "emailFinanceiro", "telefone", "website"],
  },
]

// ─── Sub-componente: Step Indicator ──────────────────────────────────────────

interface StepIndicatorProps {
  step: Step
  index: number
  currentIndex: number
  hasErrors: boolean
  isCompleted: boolean
  onClick: () => void
}

function StepIndicator({
  step,
  index,
  currentIndex,
  hasErrors,
  isCompleted,
  onClick,
}: StepIndicatorProps) {
  const isCurrent = index === currentIndex
  const isPast = index < currentIndex
  const Icon = step.icon

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
      {/* Ícone de status */}
      <div className="mt-0.5 flex-shrink-0">
        {hasErrors ? (
          <AlertCircle className="w-5 h-5 text-destructive" />
        ) : isCompleted || isPast ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : isCurrent ? (
          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/40" />
        )}
      </div>

      {/* Texto */}
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-tight truncate",
            isCurrent ? "text-primary" : "text-muted-foreground",
            hasErrors && "text-destructive",
          )}
        >
          {step.label}
          {step.required && (
            <span className="ml-1 text-destructive/60 text-xs">*</span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
          {step.description}
        </p>
      </div>

      {/* Chevron quando ativo */}
      {isCurrent && (
        <ChevronRight className="w-4 h-4 text-primary/60 ml-auto mt-0.5 flex-shrink-0" />
      )}
    </button>
  )
}

// ─── Sub-componente: Progress Header ─────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current + 1) / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
        {current + 1}/{total}
      </span>
    </div>
  )
}

// ─── Formulário por seção ─────────────────────────────────────────────────────

interface SectionProps {
  form: ReturnType<typeof useForm<CreateCompanyInput>>
  isLoadingCep: boolean
  handleCepChange: (value: string) => void
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
              <FormLabel>
                CNPJ <Required />
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="00.000.000/0000-00"
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
            <FormLabel>
              Razão Social <Required />
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Nome jurídico completo conforme CNPJ"
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
              <Input
                placeholder="Nome comercial"
                {...field}
                value={(field.value as string) ?? ""}
              />
            </FormControl>
            <FormDescription>
              Deixe em branco para usar a razão social como padrão
            </FormDescription>
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
                  {/* Adicione outros status do enum conforme necessário */}
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
              <Select
                onValueChange={field.onChange}
                value={(field.value as string) ?? undefined}
              >
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
              <Select
                onValueChange={field.onChange}
                value={(field.value as string) ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Código de Regime..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 — Simples Nacional</SelectItem>
                  <SelectItem value="2">
                    2 — Simples (Excesso de Sublimite)
                  </SelectItem>
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
                  <SelectItem value={IndicadorIE.CONTRIBUINTE}>
                    Contribuinte
                  </SelectItem>
                  <SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>
                    Não Contribuinte
                  </SelectItem>
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
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  placeholder="IE"
                />
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
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  placeholder="IM"
                />
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
                <Input
                  placeholder="0000-0/00"
                  {...field}
                  value={(field.value as string) ?? ""}
                />
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
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  placeholder="Zona Franca de Manaus"
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
          Os vínculos abaixo definem a hierarquia entre unidades da mesma
          organização e o escritório contábil responsável.
        </p>
      </div>

      <FormField
        control={form.control}
        name="parentCompanyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Empresa Matriz</FormLabel>
            <FormControl>
              {/* TODO: Substituir por ComboboxAsync quando disponível */}
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
            <FormDescription>
              Preencha apenas se esta é uma filial ou subsidiária
            </FormDescription>
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
            <FormDescription>
              Responsável pela escrituração fiscal e contábil
            </FormDescription>
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
              <FormLabel>
                CEP <Required />
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="00000-000"
                    {...field}
                    value={(field.value as string) ?? ""}
                    onChange={(e) => handleCepChange(e.target.value)}
                    disabled={isLoadingCep}
                    maxLength={9}
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
                <FormLabel>
                  Logradouro <Required />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Rua / Avenida / etc."
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

      <div className="grid grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="address.numero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Número <Required />
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  placeholder="Nº"
                />
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
                  <Input
                    placeholder="Sala, Andar, Bloco..."
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

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="address.bairro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Bairro <Required />
              </FormLabel>
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
              <FormLabel>
                Cidade <Required />
              </FormLabel>
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
              <FormLabel>
                UF <Required />
              </FormLabel>
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
                  <Input
                    placeholder="0000000"
                    {...field}
                    value={(field.value as string) ?? ""}
                  />
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
                  <Input
                    placeholder="00"
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
                <Input
                  type="email"
                  placeholder="comercial@empresa.com.br"
                  {...field}
                  value={(field.value as string) ?? ""}
                />
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
                <Input
                  type="email"
                  placeholder="financeiro@empresa.com.br"
                  {...field}
                  value={(field.value as string) ?? ""}
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
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5" /> Telefone
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  placeholder="(00) 0000-0000"
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
                <Input
                  placeholder="https://www.empresa.com.br"
                  {...field}
                  value={(field.value as string) ?? ""}
                />
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Required() {
  return <span className="text-destructive ml-0.5">*</span>
}

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

// ─── Componente Principal ─────────────────────────────────────────────────────

export function CreateCompanyDialog() {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema) as any,
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      logoUrl: "",
      status: CompanyStatus.ACTIVE,
      indicadorIE: IndicadorIE.NAO_CONTRIBUINTE,
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

  const { isSubmitting, errors } = form.formState
  const { isLoadingCep, handleCepChange } = useAddressLookup(form.setValue)

  const handleClose = useCallback(() => {
    setOpen(false)
    setCurrentStep(0)
    form.reset()
  }, [form])

  const stepHasErrors = useCallback(
    (step: Step): boolean => {
      return step.fields.some((f) => {
        const parts = f.split(".")
        let obj: Record<string, unknown> = errors as Record<string, unknown>
        for (const part of parts) {
          if (!obj || typeof obj !== "object") return false
          obj = (obj as Record<string, unknown>)[part] as Record<string, unknown>
        }
        return !!obj
      })
    },
    [errors],
  )

  const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
    try {
      const result = await createCompanyAction(data)
      if (result.success) {
        toast.success(result.message ?? "Empresa cadastrada com sucesso!")
        handleClose()
      } else if (result.errors) {
        Object.entries(result.errors).forEach(([key, messages]) => {
          form.setError(key as any, { type: "manual", message: messages[0] })
        })
        toast.error("Corrija os campos destacados antes de prosseguir.")
      } else {
        toast.error(result.message ?? "Erro ao salvar empresa.")
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.")
    }
  }

  const sectionProps: SectionProps = { form, isLoadingCep, handleCepChange }

  const sections: Record<StepId, React.ReactNode> = {
    geral: <GeralSection {...sectionProps} />,
    fiscal: <FiscalSection {...sectionProps} />,
    estrutura: <EstruturaSection {...sectionProps} />,
    endereco: <EnderecoSection {...sectionProps} />,
    contato: <ContatoSection {...sectionProps} />,
  }

  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

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
        <Plus className="h-4 w-4" />
        Nova Empresa
      </button>

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
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight leading-tight">
                  Cadastro de Empresa
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {STEPS[currentStep].label} — {STEPS[currentStep].description}
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
          <div className="pt-3">
            <ProgressBar current={currentStep} total={STEPS.length} />
          </div>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Stepper */}
          <nav className="flex-none w-52 border-r bg-muted/20 p-3 space-y-0.5 overflow-y-auto">
            {STEPS.map((step, index) => (
              <StepIndicator
                key={step.id}
                step={step}
                index={index}
                currentIndex={currentStep}
                hasErrors={stepHasErrors(step)}
                isCompleted={index < currentStep}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </nav>

          {/* Conteúdo do formulário */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 flex flex-col min-w-0"
            >
              <div className="flex-1 overflow-y-auto p-6">
                {sections[STEPS[currentStep].id]}
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
                    onClick={isFirstStep ? handleClose : () => setCurrentStep((s) => s - 1)}
                    disabled={isSubmitting}
                  >
                    {isFirstStep ? (
                      "Cancelar"
                    ) : (
                      <>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </>
                    )}
                  </Button>

                  {isLastStep ? (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[160px] font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Finalizar Cadastro
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCurrentStep((s) => s + 1)}
                      disabled={isSubmitting}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}