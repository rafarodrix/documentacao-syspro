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
} from "@/features/company/application/types";
import { CompanyStatus, IndicadorIE } from "@prisma/client";
import { createCompanyAction, updateCompanyAction } from "@/features/company/application/actions";
import { lookupCompanyProfileByCnpjClient } from "@/features/company/infrastructure/gateways/company-lookup-cnpj.gateway";
import { useAddressLookup } from "@/features/company/interface";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { Form } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegistryFormScaffold, type RegistryFormSection } from "@/components/platform/shared/RegistryFormScaffold";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  BadgeHelp,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Phone as PhoneIcon,
  Sparkles,
} from "lucide-react";

import { CompanyIdentificationTab } from "./tabs/CompanyIdentificationTab";
import { CompanyAddressTab } from "./tabs/CompanyAddressTab";
import { CompanyFiscalTab } from "./tabs/CompanyFiscalTab";
import { CompanyContactTab } from "./tabs/CompanyContactTab";
import { CompanySettingsTab } from "./tabs/CompanySettingsTab";

type SectionId = "geral" | "endereco" | "fiscal" | "contato" | "configuracoes";

const SECTIONS: Array<RegistryFormSection<SectionId> & { fields: string[] }> = [
  {
    id: "geral",
    title: "Identificacao",
    description: "Dados cadastrais",
    icon: Building2 as ElementType,
    fields: [
      "cnpj", "segment", "status", "razaoSocial", "nomeFantasia", "logoUrl",
      "dataFundacao", "naturezaJuridica", "porte", "matrizFilial", "situacaoCadastral",
    ],
  },
  {
    id: "endereco",
    title: "Endereco",
    description: "Localizacao e IBGE",
    icon: MapPin as ElementType,
    fields: [
      "address.cep", "address.pais", "address.logradouro", "address.numero",
      "address.complemento", "address.bairro", "address.cidade", "address.estado",
    ],
  },
  {
    id: "contato",
    title: "Contato",
    description: "Comunicacao e equipe",
    icon: PhoneIcon as ElementType,
    fields: ["emailContato", "emailFinanceiro", "telefone", "whatsapp", "website", "observacoes"],
  },
  {
    id: "fiscal",
    title: "Fiscal",
    description: "Regime, inscricoes e estrutura",
    icon: FileText as ElementType,
    fields: [
      "regimeTributario", "indicadorIE", "inscricaoEstadual", "inscricaoMunicipal",
      "cnae", "cnaeDescricao", "codSuframa", "parentCompanyId", "accountingFirmId",
    ],
  },
  {
    id: "configuracoes",
    title: "Configuracoes",
    description: "Servidor e acesso remoto",
    icon: BadgeHelp as ElementType,
    fields: [
      "serverType", "serverPort", "serverHost", "serverProtocol",
      "iisIsapiPath", "installationDirectory", "remoteConnections",
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

interface CreateCompanyPageFormProps {
  backHref: string;
  companies: CompanyOption[];
  mode?: "create" | "edit";
  companyId?: string;
  initialData?: Partial<CreateCompanyInput>;
  canEditCnpj?: boolean;
}

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

  async function importCompanyByCnpj(options?: { force?: boolean }) {
    const force = options?.force === true;
    const cnpj = typeof currentCnpj === "string" ? currentCnpj : "";
    const normalizedCnpj = cnpj.replace(/\D/g, "");
    if (normalizedCnpj.length !== 14) {
      toast.error("Informe um CNPJ completo antes de importar.");
      return;
    }
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
        (profile.partners ?? []).map((p) => ({
          name: p.name,
          qualification: p.qualification,
          entryDate: p.entryDate,
        })),
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

  const currentIndex = Math.max(
    SECTIONS.findIndex((s) => s.id === currentSection),
    0,
  );
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

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <RegistryFormScaffold
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary/70" />
              {mode === "edit" ? "Editar empresa" : "Nova empresa"}
            </span>
          }
          description={`${SECTIONS.find((s) => s.id === currentSection)?.title} — ${SECTIONS.find((s) => s.id === currentSection)?.description}`}
          onBack={() => router.push(backHref)}
          sections={SECTIONS}
          currentSection={currentSection}
          sectionStates={sectionStateMap}
          onSectionChange={setCurrentSection}
          progressValue={progressPct}
          progressText={`${currentIndex + 1}/${SECTIONS.length}`}
          submitLabel={mode === "edit" ? "Salvar alteracoes" : "Salvar empresa"}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          footerLeft={
            hasErrors ? (
              <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
                <AlertCircle className="h-3 w-3" />
                Campos invalidos
              </Badge>
            ) : null
          }
          footerCenter={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentSection(SECTIONS[currentIndex - 1].id)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentIndex === SECTIONS.length - 1}
                onClick={() => setCurrentSection(SECTIONS[currentIndex + 1].id)}
                className="gap-1"
              >
                Proximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          }
        >
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
        </RegistryFormScaffold>
      </form>
    </Form>
  );
}
