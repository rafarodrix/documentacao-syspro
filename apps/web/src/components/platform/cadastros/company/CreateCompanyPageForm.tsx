"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createCompanySchema,
  DEFAULT_COMPANY_INSTALLATION_DIRECTORY,
  DEFAULT_COMPANY_SERVER_HOST,
  DEFAULT_COMPANY_SERVER_PORT,
  DEFAULT_COMPANY_SERVER_PROTOCOL,
  DEFAULT_COMPANY_SERVER_TYPE,
  type CreateCompanyInput,
} from "@dosc-syspro/contracts/company";
import type {
  CompanyActionResponse,
  CompanyRegistryLookupResponse,
  CompanyOption,
} from "@/features/company/domain/model";
import { CompanyStatus, IndicadorIE } from "@prisma/client";
import { createCompanyAction, updateCompanyAction } from "@/features/company/application/actions";
import { lookupCompanyProfileByCnpjClient } from "@/features/company/infrastructure/gateways/company-lookup-cnpj.gateway";
import { useAddressLookup } from "@/features/company/interface";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShineBorder } from "@/components/magicui/ShineBorder";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BadgeHelp,
  Building2,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  CheckCircle2,
  Phone as PhoneIcon,
  Save,
  Sparkles,
} from "lucide-react";

import { CompanyIdentificationTab } from "./tabs/CompanyIdentificationTab";
import { CompanyAddressTab } from "./tabs/CompanyAddressTab";
import { CompanyFiscalTab } from "./tabs/CompanyFiscalTab";
import { CompanyContactTab } from "./tabs/CompanyContactTab";
import { CompanySettingsTab } from "./tabs/CompanySettingsTab";

// ─── Types ───────────────────────────────────────────────────────────────────
type SectionId = "geral" | "endereco" | "fiscal" | "contato" | "configuracoes";

const SECTIONS: Array<{
  id: SectionId;
  title: string;
  description: string;
  icon: ElementType;
  fields: string[];
}> = [
  {
    id: "geral",
    title: "Identificacao",
    description: "Dados cadastrais",
    icon: Building2,
    fields: [
      "cnpj","segment","status","razaoSocial","nomeFantasia","logoUrl",
      "dataFundacao","naturezaJuridica","porte","matrizFilial","situacaoCadastral",
    ],
  },
  {
    id: "endereco",
    title: "Endereco",
    description: "Localizacao e IBGE",
    icon: MapPin,
    fields: [
      "address.cep","address.pais","address.logradouro","address.numero",
      "address.complemento","address.bairro","address.cidade","address.estado",
    ],
  },
  {
    id: "contato",
    title: "Contato",
    description: "Comunicacao e equipe",
    icon: PhoneIcon,
    fields: ["emailContato","emailFinanceiro","telefone","whatsapp","website","observacoes"],
  },
  {
    id: "fiscal",
    title: "Fiscal",
    description: "Regime, inscricoes e estrutura",
    icon: FileText,
    fields: [
      "regimeTributario","indicadorIE","inscricaoEstadual","inscricaoMunicipal",
      "cnae","cnaeDescricao","codSuframa","parentCompanyId","accountingFirmId",
    ],
  },
  {
    id: "configuracoes",
    title: "Configuracoes",
    description: "Servidor e acesso remoto",
    icon: BadgeHelp,
    fields: [
      "serverType","serverPort","serverHost","serverProtocol",
      "iisIsapiPath","installationDirectory","remoteConnections",
    ],
  },
];

function hasPath(obj: unknown, path: string): boolean {
  if (!obj || typeof obj !== "object") return false;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return !!current;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface CreateCompanyPageFormProps {
  backHref: string;
  companies: CompanyOption[];
  mode?: "create" | "edit";
  companyId?: string;
  initialData?: Partial<CreateCompanyInput>;
  canEditCnpj?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function CreateCompanyPageForm({
  backHref,
  companies,
  mode = "create",
  companyId,
  initialData,
  canEditCnpj = true,
}: CreateCompanyPageFormProps) {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionId>("geral");
  const [isImportingCnpj, setIsImportingCnpj] = useState(false);
  const [lastImportedCnpj, setLastImportedCnpj] = useState<string | null>(null);
  const [justImported, setJustImported] = useState(false);

  // ── Form
  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema, undefined, { raw: true }),
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      segment: undefined,
      logoUrl: "",
      status: CompanyStatus.ACTIVE,
      serverType: DEFAULT_COMPANY_SERVER_TYPE,
      serverPort: DEFAULT_COMPANY_SERVER_PORT,
      serverHost: DEFAULT_COMPANY_SERVER_HOST,
      serverProtocol: DEFAULT_COMPANY_SERVER_PROTOCOL,
      iisIsapiPath: "SYSPROSERVERISAPI.DLL",
      installationDirectory: DEFAULT_COMPANY_INSTALLATION_DIRECTORY,
      remoteConnections: [],
      indicadorIE: IndicadorIE.NAO_CONTRIBUINTE,
      regimeTributario: undefined,
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      cnae: "",
      cnaeDescricao: "",
      cnaesSecundarios: [],
      codSuframa: "",
      parentCompanyId: "",
      accountingFirmId: "",
      naturezaJuridica: "",
      porte: "",
      matrizFilial: "",
      situacaoCadastral: "",
      qsa: [],
      emailContato: "",
      emailFinanceiro: "",
      telefone: "",
      whatsapp: "",
      website: "",
      observacoes: "",
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
      ...(initialData ?? {}),
    },
    mode: "onTouched",
  });

  const { errors, dirtyFields, isSubmitting, isDirty } = form.formState;
  const { isLoadingCep, handleCepChange } = useAddressLookup(form.setValue);

  const canSubmit = isDirty;
  const currentCnpj = form.watch("cnpj");

  // ── CNPJ import
  async function importCompanyByCnpj(options?: { force?: boolean }) {
    const force = options?.force === true;
    const cnpj = typeof currentCnpj === "string" ? currentCnpj : "";
    const normalizedCnpj = cnpj.replace(/\D/g, "");
    if (normalizedCnpj.length !== 14) { toast.error("Informe um CNPJ completo antes de importar."); return; }
    if (!force && normalizedCnpj === lastImportedCnpj) return;

    setIsImportingCnpj(true);
    setJustImported(false);
    const tid = toast.loading("Consultando CNPJ...");
    try {
      const result: CompanyActionResponse<CompanyRegistryLookupResponse> =
        await lookupCompanyProfileByCnpjClient(normalizedCnpj);

      if (!result.success || !result.data?.profile) {
        toast.dismiss(tid);
        toast.error(result.message ?? "Nao foi possivel consultar o CNPJ.");
        return;
      }

      const profile = result.data.profile as {
        cnpj: string; legalName: string; tradeName?: string; legalNature?: string; size?: string;
        branchType?: string; taxRegistrationStatus?: string; openingDate?: string;
        primaryCnae?: string; primaryCnaeDescription?: string;
        secondaryCnaes?: Array<{ code: string; description: string }>;
        partners?: Array<{ name: string; qualification: string | undefined; entryDate: string | undefined }>;
        email?: string; phone?: string;
        address?: { cep?: string; street?: string; number?: string; complement?: string; district?: string; city?: string; state?: string; country?: string };
      };

      form.setValue("cnpj", formatCNPJ(profile.cnpj), { shouldDirty: true });
      form.setValue("razaoSocial", profile.legalName ?? "", { shouldDirty: true });
      form.setValue("nomeFantasia", profile.tradeName ?? "", { shouldDirty: true });
      form.setValue("cnae", profile.primaryCnae ?? "", { shouldDirty: true });
      form.setValue("cnaeDescricao", profile.primaryCnaeDescription ?? "", { shouldDirty: true });
      form.setValue("cnaesSecundarios", profile.secondaryCnaes ?? [], { shouldDirty: true });
      form.setValue("naturezaJuridica", profile.legalNature ?? "", { shouldDirty: true });
      form.setValue("porte", profile.size ?? "", { shouldDirty: true });
      form.setValue("matrizFilial", profile.branchType ?? "", { shouldDirty: true });
      form.setValue("situacaoCadastral", profile.taxRegistrationStatus ?? "", { shouldDirty: true });
      form.setValue(
        "qsa",
        (profile.partners ?? []).map((p) => ({ name: p.name, qualification: p.qualification, entryDate: p.entryDate })),
        { shouldDirty: true },
      );
      form.setValue("emailContato", profile.email ?? "", { shouldDirty: true });
      form.setValue("telefone", profile.phone ? formatPhone(profile.phone) : "", { shouldDirty: true });
      if (profile.openingDate) form.setValue("dataFundacao", profile.openingDate, { shouldDirty: true });
      if (profile.address) {
        form.setValue("address.cep", profile.address.cep ?? "", { shouldDirty: true });
        form.setValue("address.logradouro", profile.address.street ?? "", { shouldDirty: true });
        form.setValue("address.numero", profile.address.number ?? "", { shouldDirty: true });
        form.setValue("address.complemento", profile.address.complement ?? "", { shouldDirty: true });
        form.setValue("address.bairro", profile.address.district ?? "", { shouldDirty: true });
        form.setValue("address.cidade", profile.address.city ?? "", { shouldDirty: true });
        form.setValue("address.estado", profile.address.state ?? "", { shouldDirty: true });
        form.setValue("address.pais", profile.address.country ?? "BR", { shouldDirty: true });
      }

      setLastImportedCnpj(normalizedCnpj);
      setJustImported(true);
      setTimeout(() => setJustImported(false), 5000);

      toast.dismiss(tid);
      toast.success("Cadastro preenchido automaticamente a partir do CNPJ.");
    } catch (error) {
      console.error("[company.lookup-cnpj.error]", error);
      toast.dismiss(tid);
      toast.error("Erro ao consultar CNPJ.");
    } finally {
      setIsImportingCnpj(false);
    }
  }

  // ── Submit
  const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
    const result =
      mode === "edit" && companyId
        ? await updateCompanyAction(companyId, data)
        : await createCompanyAction(data);
    if (!result.success) {
      toast.error(result.message ?? (mode === "edit" ? "Erro ao atualizar empresa." : "Erro ao cadastrar empresa."));
      return;
    }
    toast.success(result.message ?? (mode === "edit" ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso."));
    router.push(backHref);
    router.refresh();
  };

  // ── Section helpers
  const current = SECTIONS.find((s) => s.id === currentSection) ?? SECTIONS[0];
  const currentIndex = Math.max(SECTIONS.findIndex((s) => s.id === current.id), 0);
  const progressPct = Math.round(((currentIndex + 1) / SECTIONS.length) * 100);

  const sectionStateMap = useMemo(() => {
    return SECTIONS.reduce<Record<SectionId, "error" | "ready" | "idle">>((acc, section) => {
      const hasError = section.fields.some((field) => hasPath(errors, field));
      if (hasError) { acc[section.id] = "error"; return acc; }
      const hasTouched = section.fields.some((field) => hasPath(dirtyFields, field));
      acc[section.id] = hasTouched ? "ready" : "idle";
      return acc;
    }, {} as Record<SectionId, "error" | "ready" | "idle">);
  }, [dirtyFields, errors]);

  // ── Render
  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-2xl border border-border/50 bg-card/95 overflow-hidden shadow-xl">
      <ShineBorder borderWidth={1} duration={16} shineColor={["#2dd4bf", "#60a5fa", "#a78bfa"]} />

      {/* ── Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4 bg-linear-to-r from-muted/30 via-background to-muted/20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary/70" />
            {mode === "edit" ? "Editar empresa" : "Nova empresa"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {current.title} — {current.description}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* ── Progress bar */}
      <div className="border-b border-border/50 px-6 py-3 bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do cadastro</span>
          <span className="font-medium text-foreground">
            {currentIndex + 1}/{SECTIONS.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Body */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row min-h-[calc(100vh-260px)]">
          {/* Sidebar nav */}
          <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border/50 bg-muted/20 p-3 flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-x-visible backdrop-blur-sm hide-scrollbar">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isCurrent = section.id === currentSection;
              const state = sectionStateMap[section.id];
              const hasError = state === "error";
              const isReady = state === "ready";

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setCurrentSection(section.id)}
                  className={cn(
                    "group shrink-0 w-48 md:w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all border",
                    isCurrent
                      ? "bg-primary/10 border-primary/20 shadow-sm"
                      : "hover:bg-muted/70 border-transparent hover:border-border/50",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 p-1.5 rounded-md",
                      isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      hasError && "bg-destructive/10 text-destructive",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          isCurrent ? "text-primary" : "text-foreground",
                          hasError && "text-destructive",
                        )}
                      >
                        {section.title}
                      </p>
                      {isReady && !hasError && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{section.description}</p>
                    {isReady && !hasError && (
                      <Badge
                        variant="outline"
                        className="mt-1 h-5 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] text-emerald-600"
                      >
                        Pronto
                      </Badge>
                    )}
                  </div>
                  {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-primary/70 mt-1" />}
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {currentSection === "geral" && (
                    <CompanyIdentificationTab
                      mode={mode}
                      canEditCnpj={canEditCnpj}
                      isImportingCnpj={isImportingCnpj}
                      lastImportedCnpj={lastImportedCnpj}
                      justImported={justImported}
                      onImportCnpj={importCompanyByCnpj}
                      setLastImportedCnpj={setLastImportedCnpj}
                    />
                  )}
                  {currentSection === "endereco" && (
                    <CompanyAddressTab isLoadingCep={isLoadingCep} onCepChange={handleCepChange} />
                  )}
                  {currentSection === "contato" && <CompanyContactTab />}
                  {currentSection === "fiscal" && <CompanyFiscalTab companies={companies} />}
                  {currentSection === "configuracoes" && <CompanySettingsTab />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Sticky footer */}
            <div className="sticky bottom-0 z-10 border-t border-border/50 bg-card/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {Object.keys(errors).length > 0 && (
                  <Badge variant="destructive" className="text-[11px] gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Campos invalidos
                  </Badge>
                )}
                {/* Nav prev/next */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentSection(SECTIONS[currentIndex - 1].id)}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={currentIndex === SECTIONS.length - 1}
                    onClick={() => setCurrentSection(SECTIONS[currentIndex + 1].id)}
                  >
                    Proximo
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2" disabled={isSubmitting || !canSubmit}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {mode === "edit" ? "Salvar alteracoes" : "Salvar empresa"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
