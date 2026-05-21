"use client";

import type { DragEvent, FormEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  GripVertical,
  Info,
  KanbanSquare,
  PencilLine,
  Target,
  UserRound,
  Plus,
  Trash2,
  Calendar,
  Square,
  CheckSquare,
  MessageSquare,
  ExternalLink,
  Phone,
  Mail,
  User,
  PlusCircle,
  FileSearch,
  Building,
  Globe,
  Settings,
  X,
  PlayCircle
} from "lucide-react";
import { toast } from "sonner";
import type { CrmLead, CrmLeadStage, CrmLeadManualContact, CrmActivity, CrmTask } from "@dosc-syspro/contracts/crm";
import { CRM_LEAD_SOURCE_VALUES, CRM_LEAD_STAGE_VALUES } from "@dosc-syspro/contracts/crm";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Input,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dosc-syspro/ui";
import {
  RegistryFilterGroup,
  RegistryTableCard,
  RegistryToolbar,
} from "@/components/platform/shared/registry-list-scaffold";
import {
  CRM_ACTIVE_STAGE_ORDER,
  CRM_SOURCE_LABELS,
  CRM_STAGE_LABELS,
  formatLeadCurrency,
  type LeadDashboardData,
} from "@/features/crm/domain/crm.types";
import { cn, formatDateSafe } from "@/lib/utils";
import { trpc } from "@/lib/api/trpc-client";
import { lookupCompanyProfileByCnpjAction } from "@/features/company/application/company-write.actions";
import { formatCNPJ, isValidCnpj } from "@/lib/formatters";

type LeadFormState = {
  title: string;
  stage: string;
  source: string;
  companyName: string;
  tradeName: string;
  document: string;
  industry: string;
  companySize: string;
  city: string;
  state: string;
  estimatedValue: string;
  licenseValue: string;
  monthlyFee: string;
  minimumWagePercentage: string;
  expectedCloseAt: string;
  nextStep: string;
  qualificationNotes: string;
  lostReason: string;
};

const DEFAULT_FORM_STATE: LeadFormState = {
  title: "",
  stage: "LEAD",
  source: "MANUAL",
  companyName: "",
  tradeName: "",
  document: "",
  industry: "",
  companySize: "",
  city: "",
  state: "",
  estimatedValue: "",
  licenseValue: "",
  monthlyFee: "",
  minimumWagePercentage: "",
  expectedCloseAt: "",
  nextStep: "",
  qualificationNotes: "",
  lostReason: "",
};

const EMPTY_CONTACT: CrmLeadManualContact = {
  name: "",
  role: "",
  email: "",
  phone: "",
  whatsapp: "",
  isPrimary: false,
  notes: "",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function parseNullableNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapLeadToFormState(lead?: CrmLead | null): LeadFormState {
  if (!lead) return DEFAULT_FORM_STATE;

  return {
    title: lead.title ?? "",
    stage: lead.stage ?? "LEAD",
    source: lead.source ?? "MANUAL",
    companyName: lead.companyName ?? "",
    tradeName: lead.tradeName ?? "",
    document: lead.document ? formatCNPJ(lead.document) : "",
    industry: lead.industry ?? "",
    companySize: lead.companySize ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    estimatedValue: typeof lead.estimatedValue === "number" ? String(lead.estimatedValue) : "",
    licenseValue: typeof lead.licenseValue === "number" ? String(lead.licenseValue) : "",
    monthlyFee: typeof lead.monthlyFee === "number" ? String(lead.monthlyFee) : "",
    minimumWagePercentage: typeof lead.minimumWagePercentage === "number" ? String(lead.minimumWagePercentage) : "",
    expectedCloseAt: lead.expectedCloseAt ? lead.expectedCloseAt.slice(0, 10) : "",
    nextStep: lead.nextStep ?? "",
    qualificationNotes: lead.qualificationNotes ?? "",
    lostReason: lead.lostReason ?? "",
  };
}


type LeadStatusFilter = "ACTIVE" | "WON" | "LOST";
type LeadAttentionFilter = "ALL" | "OVERDUE" | "NO_NEXT_STEP" | "DUE_SOON";
type PipelineColumnId = "LEAD" | "VALIDATION" | "PROPOSAL" | "NEGOTIATION";

const DUE_SOON_DAYS = 7;
const STALE_LEAD_DAYS = 7;
const PIPELINE_COLUMNS: Array<{
  id: PipelineColumnId;
  label: string;
  description: string;
  stages: CrmLeadStage[];
  dropStage: CrmLeadStage;
}> = [
  {
    id: "LEAD",
    label: "Lead",
    description: "Entrada inicial.",
    stages: ["LEAD"],
    dropStage: "LEAD",
  },
  {
    id: "VALIDATION",
    label: "Validacao",
    description: "Comercial validando aderencia.",
    stages: ["MQL", "SQL"],
    dropStage: "SQL",
  },
  {
    id: "PROPOSAL",
    label: "Proposta",
    description: "Proposta ou demo comercial.",
    stages: ["PROPOSAL"],
    dropStage: "PROPOSAL",
  },
  {
    id: "NEGOTIATION",
    label: "Negociacao",
    description: "Ajustes finais para fechamento.",
    stages: ["NEGOTIATION"],
    dropStage: "NEGOTIATION",
  },
];
const STAGE_GUIDE_ITEMS = [
  ...PIPELINE_COLUMNS.map((column) => ({
    id: column.id,
    label: column.label,
    description: column.description,
    active: true,
  })),
  {
    id: "WON",
    label: CRM_STAGE_LABELS.WON,
    description: "Negocio ganho e convertido em cliente.",
    active: false,
  },
  {
    id: "LOST",
    label: CRM_STAGE_LABELS.LOST,
    description: "Oportunidade encerrada sem conversao.",
    active: false,
  },
] as const;
const STAGE_SELECT_OPTIONS: Array<{ value: CrmLeadStage; label: string }> = [
  { value: "LEAD", label: "Lead" },
  { value: "SQL", label: "Validacao" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "NEGOTIATION", label: "Negociacao" },
  { value: "WON", label: CRM_STAGE_LABELS.WON },
  { value: "LOST", label: CRM_STAGE_LABELS.LOST },
];

function getPipelineStageLabel(stage: CrmLeadStage) {
  if (stage === "MQL" || stage === "SQL") return "Validacao";
  return CRM_STAGE_LABELS[stage];
}

function normalizeStageForSelect(stage: CrmLeadStage) {
  return stage === "MQL" ? "SQL" : stage;
}

function resolveLeadContactName(lead: CrmLead) {
  const contacts = lead.contacts || [];
  const primaryManualContact = contacts.find((contact) => contact.isPrimary)?.name?.trim();
  const firstManualContact = contacts.find((contact) => contact.name?.trim())?.name?.trim();
  return lead.primaryContactName || primaryManualContact || firstManualContact || "Sem contato vinculado";
}

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getLeadAttentionState(lead: CrmLead) {
  const today = getStartOfToday();
  const expectedCloseAt = lead.expectedCloseAt ? new Date(lead.expectedCloseAt) : null;
  const updatedAt = new Date(lead.updatedAt);
  const daysWithoutUpdate = Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
  const expectedDiffDays = expectedCloseAt ? Math.ceil((expectedCloseAt.getTime() - today.getTime()) / 86400000) : null;

  return {
    isClosed: lead.stage === "WON" || lead.stage === "LOST",
    isOverdue: Boolean(expectedCloseAt && expectedCloseAt < today && lead.stage !== "WON" && lead.stage !== "LOST"),
    isDueSoon: Boolean(
      expectedDiffDays !== null &&
      expectedDiffDays >= 0 &&
      expectedDiffDays <= DUE_SOON_DAYS &&
      lead.stage !== "WON" &&
      lead.stage !== "LOST",
    ),
    hasNextStep: Boolean(lead.nextStep?.trim()),
    isStale: daysWithoutUpdate >= STALE_LEAD_DAYS && lead.stage !== "WON" && lead.stage !== "LOST",
    daysWithoutUpdate,
    expectedDiffDays,
  };
}

function matchesAttentionFilter(lead: CrmLead, filter: LeadAttentionFilter) {
  const state = getLeadAttentionState(lead);
  if (filter === "OVERDUE") return state.isOverdue;
  if (filter === "NO_NEXT_STEP") return !state.hasNextStep && !state.isClosed;
  if (filter === "DUE_SOON") return state.isDueSoon;
  return true;
}

function sortLeadsForBoard(leads: CrmLead[]) {
  return [...leads].sort((a, b) => {
    const aAttention = getLeadAttentionState(a);
    const bAttention = getLeadAttentionState(b);

    const aScore = Number(aAttention.isOverdue) * 4 + Number(!aAttention.hasNextStep) * 3 + Number(aAttention.isDueSoon) * 2 + Number(aAttention.isStale);
    const bScore = Number(bAttention.isOverdue) * 4 + Number(!bAttention.hasNextStep) * 3 + Number(bAttention.isDueSoon) * 2 + Number(bAttention.isStale);
    if (aScore !== bScore) return bScore - aScore;

    const aDate = a.expectedCloseAt ? new Date(a.expectedCloseAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.expectedCloseAt ? new Date(b.expectedCloseAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDate !== bDate) return aDate - bDate;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function groupLeadsByStageLocal(leads: CrmLead[]) {
  return {
    LEAD: leads.filter((lead) => lead.stage === "LEAD"),
    MQL: leads.filter((lead) => lead.stage === "MQL"),
    SQL: leads.filter((lead) => lead.stage === "SQL"),
    PROPOSAL: leads.filter((lead) => lead.stage === "PROPOSAL"),
    NEGOTIATION: leads.filter((lead) => lead.stage === "NEGOTIATION"),
    WON: leads.filter((lead) => lead.stage === "WON"),
    LOST: leads.filter((lead) => lead.stage === "LOST"),
  };
}

function unwrapCollectionResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: T[] }).data;
  }
  return [];
}

function getPipelineColumnLeads(
  grouped: ReturnType<typeof groupLeadsByStageLocal>,
  column: (typeof PIPELINE_COLUMNS)[number],
) {
  return column.stages.flatMap((stage) => grouped[stage]);
}

export function LeadManagementPage({ data }: { data: LeadDashboardData }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [leads, setLeads] = useState<CrmLead[]>(data.leads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("ACTIVE");
  const [attentionFilter, setAttentionFilter] = useState<LeadAttentionFilter>("ALL");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<CrmLeadStage | null>(null);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [isStageGuideOpen, setIsStageGuideOpen] = useState(false);

  // Drawer States
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetailsRaw, setLeadDetailsRaw] = useState<CrmLead | null>(null);

  const setLeadDetails = (lead: CrmLead | null | ((prev: CrmLead | null) => CrmLead | null)) => {
    setLeadDetailsRaw((prev) => {
      const resolved = typeof lead === "function" ? lead(prev) : lead;
      if (!resolved) return null;
      return resolved;
    });
  };

  const leadDetails = leadDetailsRaw;
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form edit states
  const [editForm, setEditForm] = useState<LeadFormState>(DEFAULT_FORM_STATE);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  // Activities & Tasks States
  const [newActivityBody, setNewActivityBody] = useState("");
  const [isPostingActivity, setIsPostingActivity] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Contacts Edit States
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<CrmLeadManualContact | null>(null);

  useEffect(() => {
    setLeads(data.leads);
  }, [data.leads]);

  // Fetch lead details on selection
  useEffect(() => {
    if (!selectedLeadId) {
      setLeadDetails(null);
      setActivities([]);
      setTasks([]);
      return;
    }

    async function fetchLeadDetails() {
      setIsLoadingDetails(true);
      try {
        const response = await trpc.crm.getById.query({ id: selectedLeadId! });
        if (response.success && response.data) {
          setLeadDetails(response.data);
          setEditForm(mapLeadToFormState(response.data));
        } else {
          toast.error("Falha ao carregar detalhes do lead.");
          setSelectedLeadId(null);
        }

        const activitiesRes = await trpc.crm.listActivities.query({ leadId: selectedLeadId! });
        setActivities(unwrapCollectionResponse<CrmActivity>(activitiesRes));

        const tasksRes = await trpc.crm.listTasks.query({ leadId: selectedLeadId! });
        setTasks(unwrapCollectionResponse<CrmTask>(tasksRes));
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar dados do lead.");
        setSelectedLeadId(null);
      } finally {
        setIsLoadingDetails(false);
      }
    }

    fetchLeadDetails();
  }, [selectedLeadId]);

  const grouped = useMemo(() => groupLeadsByStageLocal(leads), [leads]);
  const activeLeads = useMemo(() => leads.filter((lead) => !["WON", "LOST"].includes(lead.stage)), [leads]);
  const validationCount = grouped.MQL.length + grouped.SQL.length;

  const normalizedSearch = search.trim().toLowerCase();
  const searchedLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (!normalizedSearch) return true;
        return [
          lead.companyName,
          lead.title,
          lead.primaryContactName,
          lead.ownerName,
          lead.nextStep,
          lead.lostReason,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch));
      }),
    [leads, normalizedSearch],
  );

  const filteredLeads = useMemo(
    () => searchedLeads.filter((lead) => matchesAttentionFilter(lead, attentionFilter)),
    [searchedLeads, attentionFilter],
  );

  const filteredGrouped = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(groupLeadsByStageLocal(filteredLeads)).map(([stage, stageLeads]) => [stage, sortLeadsForBoard(stageLeads)]),
      ) as ReturnType<typeof groupLeadsByStageLocal>,
    [filteredLeads],
  );
  const closedFilteredLeads = useMemo(() => {
    if (statusFilter === "WON") return filteredLeads.filter((lead) => lead.stage === "WON");
    return filteredLeads.filter((lead) => lead.stage === "LOST");
  }, [filteredLeads, statusFilter]);

  const stageSummaryFilters = [
    { value: "ACTIVE" as const, label: "Todos", count: activeLeads.length },
    { value: "WON" as const, label: "Ganhos", count: grouped.WON.length },
    { value: "LOST" as const, label: "Perdidos", count: grouped.LOST.length },
  ];
  const attentionSummaryFilters = [
    { value: "ALL" as const, label: "Todos", count: searchedLeads.length },
    { value: "OVERDUE" as const, label: "Atrasados", count: searchedLeads.filter((lead) => getLeadAttentionState(lead).isOverdue).length },
    { value: "NO_NEXT_STEP" as const, label: "Sem proximo passo", count: searchedLeads.filter((lead) => !getLeadAttentionState(lead).hasNextStep && !getLeadAttentionState(lead).isClosed).length },
    { value: "DUE_SOON" as const, label: "Fechando em breve", count: searchedLeads.filter((lead) => getLeadAttentionState(lead).isDueSoon).length },
  ];
  const paginationSummary =
    data.pagination && data.pagination.total > data.leads.length
      ? `Exibindo ${data.leads.length} de ${data.pagination.total} leads`
      : data.pagination
        ? `${data.pagination.total} leads`
        : `${filteredLeads.length} leads`;

  async function persistLeadUpdate(
    leadId: string,
    payload: Record<string, unknown>,
    options?: {
      successMessage?: string;
      optimisticLead?: CrmLead;
    },
  ) {
    if (!Object.keys(payload).length) {
      toast.info("Nenhuma alteracao para salvar.");
      return;
    }

    const previousLeads = leads;
    setSavingLeadId(leadId);

    if (options?.optimisticLead) {
      setLeads((current) => current.map((lead) => (lead.id === leadId ? options.optimisticLead ?? lead : lead)));
    }

    try {
      const result = await trpc.crm.update.mutate({
        id: leadId,
        data: payload,
      });

      if (!result?.success || !result?.data) {
        setLeads(previousLeads);
        toast.error(result?.error || result?.message || "Falha ao atualizar lead.");
        return;
      }

      const updatedLead = result.data as CrmLead;
      setLeads((current) => current.map((lead) => (lead.id === leadId ? updatedLead : lead)));

      if (options?.successMessage) toast.success(options.successMessage);

      // If we are currently viewing this lead in the drawer, sync the leadDetails
      if (selectedLeadId === leadId) {
        setLeadDetails(updatedLead);
        setEditForm(mapLeadToFormState(updatedLead));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      setLeads(previousLeads);
      toast.error("Falha ao atualizar lead.");
    } finally {
      setSavingLeadId(null);
    }
  }

  function openEditor(leadId: string) {
    setSelectedLeadId(leadId);
  }

  // update Form Field helper
  function updateEditField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveForm(event?: FormEvent<HTMLFormElement> | MouseEvent) {
    if (event) event.preventDefault();
    if (!leadDetails) return;

    if (!editForm.title.trim()) {
      toast.error("Informe o título do lead.");
      return;
    }

    if (!editForm.companyName.trim()) {
      toast.error("Informe a empresa potencial.");
      return;
    }

    setIsSavingForm(true);

    try {
      const dataPayload = {
        title: editForm.title.trim(),
        stage: editForm.stage as any,
        source: editForm.source as any,
        companyName: editForm.companyName.trim(),
        tradeName: editForm.tradeName.trim() || null,
        document: onlyDigits(editForm.document) || null,
        industry: editForm.industry.trim() || null,
        companySize: editForm.companySize.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        estimatedValue: parseNullableNumber(editForm.estimatedValue),
        licenseValue: parseNullableNumber(editForm.licenseValue),
        monthlyFee: parseNullableNumber(editForm.monthlyFee),
        minimumWagePercentage: parseNullableNumber(editForm.minimumWagePercentage),
        expectedCloseAt: editForm.expectedCloseAt || null,
        nextStep: editForm.nextStep.trim() || null,
        qualificationNotes: editForm.qualificationNotes.trim() || null,
        lostReason: editForm.lostReason.trim() || null,
      };

      const result = await trpc.crm.update.mutate({ id: leadDetails.id, data: dataPayload });

      if (!result?.success || !result?.data) {
        toast.error(result?.error || result?.message || "Falha ao atualizar lead.");
        return;
      }

      const updatedLead = result.data as CrmLead;
      setLeadDetails(updatedLead);
      setLeads((current) => current.map((lead) => (lead.id === leadDetails.id ? updatedLead : lead)));
      toast.success("Lead atualizado com sucesso.");
      
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Falha ao atualizar lead.");
    } finally {
      setIsSavingForm(false);
    }
  }

  async function handleLookupCnpj() {
    const normalizedCnpj = onlyDigits(editForm.document);

    if (normalizedCnpj.length !== 14) {
      toast.error("Informe um CNPJ completo.");
      return;
    }

    if (!isValidCnpj(normalizedCnpj)) {
      toast.error("Informe um CNPJ válido.");
      return;
    }

    setIsLookupLoading(true);
    try {
      const result = await lookupCompanyProfileByCnpjAction(normalizedCnpj);

      if (!result.success || !result.data?.profile) {
        toast.error(result.message || "Não foi possível consultar o CNPJ.");
        setIsLookupLoading(false);
        return;
      }

      const profile = result.data.profile;
      setEditForm((current) => ({
        ...current,
        document: formatCNPJ(profile.cnpj),
        companyName: profile.legalName || current.companyName,
        tradeName: profile.tradeName || current.tradeName,
        city: profile.address?.city || current.city,
        state: profile.address?.state || current.state,
        industry: profile.primaryCnaeDescription || current.industry,
      }));

      toast.success("Dados da empresa preenchidos a partir do CNPJ.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao consultar CNPJ.");
    } finally {
      setIsLookupLoading(false);
    }
  }

  async function handleAddActivity() {
    if (!newActivityBody.trim() || !leadDetails) return;
    setIsPostingActivity(true);
    try {
      const res = await trpc.crm.createActivity.mutate({
        leadId: leadDetails.id,
        type: "NOTE",
        body: newActivityBody.trim(),
      });
      if (res.success) {
        setNewActivityBody("");
        toast.success("Anotação adicionada!");
        const activitiesRes = await trpc.crm.listActivities.query({ leadId: leadDetails.id });
        setActivities(unwrapCollectionResponse<CrmActivity>(activitiesRes));
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Falha ao adicionar anotação.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar anotação.");
    } finally {
      setIsPostingActivity(false);
    }
  }

  async function handleToggleTaskStatus(task: CrmTask) {
    if (!leadDetails) return;
    const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const res = await trpc.crm.updateTask.mutate({
        id: task.id,
        data: { status: newStatus },
      });
      if (res.success) {
        toast.success(`Tarefa marcada como ${newStatus === "COMPLETED" ? "concluída" : "pendente"}.`);
        const tasksRes = await trpc.crm.listTasks.query({ leadId: leadDetails.id });
        setTasks(unwrapCollectionResponse<CrmTask>(tasksRes));
      } else {
        toast.error(res.error || "Falha ao atualizar tarefa.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar tarefa.");
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !leadDetails) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    setIsCreatingTask(true);
    try {
      const res = await trpc.crm.createTask.mutate({
        leadId: leadDetails.id,
        title: newTaskTitle.trim(),
        dueDate: newTaskDueDate,
        status: "PENDING",
      });
      if (res.success) {
        setNewTaskTitle("");
        toast.success("Tarefa criada!");
        const tasksRes = await trpc.crm.listTasks.query({ leadId: leadDetails.id });
        setTasks(unwrapCollectionResponse<CrmTask>(tasksRes));
      } else {
        toast.error(res.error || "Falha ao criar tarefa.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar tarefa.");
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!leadDetails) return;
    try {
      const res = await trpc.crm.deleteTask.mutate({ id: taskId });
      if (res.success) {
        toast.success("Tarefa excluída.");
        const tasksRes = await trpc.crm.listTasks.query({ leadId: leadDetails.id });
        setTasks(unwrapCollectionResponse<CrmTask>(tasksRes));
      } else {
        toast.error(res.error || "Falha ao excluir tarefa.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir tarefa.");
    }
  }

  async function handleSaveContacts(updatedContacts: CrmLeadManualContact[]) {
    if (!leadDetails) return;
    try {
      const res = await trpc.crm.update.mutate({
        id: leadDetails.id,
        data: {
          contacts: updatedContacts,
        },
      });
      if (res.success && res.data) {
        const updated = res.data as CrmLead;
        setLeadDetails(updated);
        setLeads((current) => current.map((l) => (l.id === leadDetails.id ? updated : l)));
        toast.success("Contatos atualizados.");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Falha ao atualizar contatos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar contatos.");
    }
  }

  async function handleSaveContact() {
    if (!editingContact || !leadDetails || editingContactIndex === null) return;
    if (!editingContact.name.trim()) {
      toast.error("Nome do contato é obrigatório.");
      return;
    }

    const updatedContacts = [...leadDetails.contacts];
    if (editingContactIndex < updatedContacts.length) {
      // Edit existing
      updatedContacts[editingContactIndex] = {
        ...editingContact,
        name: editingContact.name.trim(),
        role: editingContact.role?.trim() || "",
        email: editingContact.email?.trim() || "",
        phone: editingContact.phone?.trim() || "",
        whatsapp: editingContact.whatsapp?.trim() || "",
        notes: editingContact.notes?.trim() || "",
      };
    } else {
      // Add new
      updatedContacts.push({
        ...editingContact,
        name: editingContact.name.trim(),
        role: editingContact.role?.trim() || "",
        email: editingContact.email?.trim() || "",
        phone: editingContact.phone?.trim() || "",
        whatsapp: editingContact.whatsapp?.trim() || "",
        notes: editingContact.notes?.trim() || "",
        isPrimary: updatedContacts.length === 0,
      });
    }

    await handleSaveContacts(updatedContacts);
    setEditingContactIndex(null);
    setEditingContact(null);
  }

  async function handleRemoveContact(index: number) {
    if (!leadDetails) return;
    const updatedContacts = leadDetails.contacts.filter((_, idx) => idx !== index);
    if (updatedContacts.length > 0) {
      const hasPrimary = updatedContacts.some((c) => c.isPrimary);
      if (!hasPrimary) {
        updatedContacts[0].isPrimary = true;
      }
    }
    await handleSaveContacts(updatedContacts);
  }

  async function handleStageChange(lead: CrmLead, nextStage: CrmLeadStage) {
    if (lead.stage === nextStage || savingLeadId) return;

    if (nextStage === "LOST" && !(lead.lostReason ?? "").trim()) {
      openEditor(lead.id);
      toast.info("Informe o motivo da perda para encerrar o lead.");
      return;
    }

    await persistLeadUpdate(
      lead.id,
      { stage: nextStage },
      {
        successMessage: `Lead movido para ${getPipelineStageLabel(nextStage)}.`,
        optimisticLead: {
          ...lead,
          stage: nextStage,
        },
      },
    );
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, leadId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", leadId);
    setDraggedLeadId(leadId);
  }

  function handleDragEnd() {
    setDraggedLeadId(null);
    setHoveredStage(null);
  }

  async function handleDrop(stage: CrmLeadStage) {
    if (!draggedLeadId) return;
    const draggedLead = leads.find((lead) => lead.id === draggedLeadId);
    setHoveredStage(null);
    setDraggedLeadId(null);
    if (!draggedLead) return;
    await handleStageChange(draggedLead, stage);
  }

  return (
    <>
      <div className="space-y-5 pb-20">
        <RegistryToolbar
          searchValue={search}
          searchPlaceholder="Buscar empresa, titulo, contato ou proximo passo..."
          onSearchChange={setSearch}
          onClearSearch={() => setSearch("")}
          resultLabel={paginationSummary}
          filters={

            <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
              <RegistryFilterGroup value={statusFilter} onChange={setStatusFilter} options={stageSummaryFilters} />
              <RegistryFilterGroup value={attentionFilter} onChange={setAttentionFilter} options={attentionSummaryFilters} />
            </div>
          }
          actions={
            <>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setIsStageGuideOpen(true)}>
                <Info className="h-4 w-4" />
                Etapas
              </Button>
              <Button asChild size="sm" className="h-9 gap-2">
                <Link href="/portal/comercial/leads/novo">
                  <ArrowRight className="h-4 w-4" />
                  Novo lead
                </Link>
              </Button>
            </>
          }
        />

        <RegistryTableCard>
          <CardContent className="pt-6">
            {leads.length === 0 ? (
              <EmptyPipelineState />
            ) : statusFilter === "ACTIVE" ? (
              <div className="space-y-4">
                {filteredLeads.filter((lead) => CRM_ACTIVE_STAGE_ORDER.includes(lead.stage)).length === 0 ? (
                  <FilteredEmptyState search={search} statusLabel="pipeline ativo" />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                    {PIPELINE_COLUMNS.map((column) => {
                      const stageLeads = getPipelineColumnLeads(filteredGrouped, column);
                      return (
                        <section
                          key={column.id}
                          className={cn(
                            "min-w-0 rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors",
                            hoveredStage === column.dropStage && "border-primary/50 bg-primary/5",
                          )}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (draggedLeadId) setHoveredStage(column.dropStage);
                          }}
                          onDragLeave={() => setHoveredStage((current) => (current === column.dropStage ? null : current))}
                          onDrop={async (event) => {
                            event.preventDefault();
                            await handleDrop(column.dropStage);
                          }}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{column.label}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">{column.description}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 rounded-full px-2.5">
                              {stageLeads.length}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            {stageLeads.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border/60 bg-background/70 px-3 py-8 text-center text-xs text-muted-foreground">
                                Nenhum lead nesta etapa.
                              </div>
                            ) : (
                              stageLeads.map((lead) => (
                                <LeadCard
                                  key={lead.id}
                                  lead={lead}
                                  isSaving={savingLeadId === lead.id || isRefreshing}
                                  onEdit={() => openEditor(lead.id)}
                                  onStageChange={(nextStage) => handleStageChange(lead, nextStage)}
                                  onDragStart={handleDragStart}
                                  onDragEnd={handleDragEnd}
                                />
                              ))
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : closedFilteredLeads.length === 0 ? (
              <FilteredEmptyState
                search={search}
                statusLabel={
                  statusFilter === "WON" ? "ganhos" : statusFilter === "LOST" ? "perdidos" : "encerrados"
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {closedFilteredLeads.map((lead) => (
                  <ClosedLeadCard
                    key={lead.id}
                    lead={lead}
                    isSaving={savingLeadId === lead.id || isRefreshing}
                    onEdit={() => openEditor(lead.id)}
                    onStageChange={(nextStage) => handleStageChange(lead, nextStage)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </RegistryTableCard>
      </div>

      <Sheet open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
        <SheetContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto w-full h-full max-h-screen border-l border-border/60 bg-background p-6">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
                  {leadDetails ? leadDetails.companyName : "Carregando lead..."}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Visualização detalhada e edição rápida do lead.
                </SheetDescription>
              </div>
              {leadDetails && (
                <Badge variant={leadDetails.stage === "WON" ? "default" : "outline"} className="text-xs">
                  {CRM_STAGE_LABELS[leadDetails.stage]}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="flex h-[350px] flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Carregando informações do lead...</p>
            </div>
          ) : leadDetails ? (
            <div className="space-y-6 pt-2">
              {/* WON Conversion Success Banner */}
              {leadDetails.convertedCompanyId && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-semibold text-foreground">Lead Convertido em Cliente!</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uma empresa fiscal foi provisionada com sucesso a partir deste lead.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 shrink-0">
                      <Link href="/portal/cadastros/empresa">
                        Ver empresa
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-4 bg-muted/30 p-1 border border-border/60 rounded-lg">
                  <TabsTrigger value="dados" className="text-xs py-1.5">Dados</TabsTrigger>
                  <TabsTrigger value="contatos" className="text-xs py-1.5">Contatos</TabsTrigger>
                  <TabsTrigger value="atividades" className="text-xs py-1.5">Histórico</TabsTrigger>
                  <TabsTrigger value="tarefas" className="text-xs py-1.5">Tarefas</TabsTrigger>
                </TabsList>

                {/* TAB 1: DADOS */}
                <TabsContent value="dados" className="mt-4 space-y-4">
                  <form onSubmit={handleSaveForm} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-title" className="text-xs font-semibold">Título do Lead *</Label>
                        <Input
                          id="edit-title"
                          value={editForm.title}
                          onChange={(e) => updateEditField("title", e.target.value)}
                          placeholder="Ex.: Rede avaliando ERP"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-company-name" className="text-xs font-semibold">Empresa Potencial *</Label>
                        <Input
                          id="edit-company-name"
                          value={editForm.companyName}
                          onChange={(e) => updateEditField("companyName", e.target.value)}
                          placeholder="Nome da empresa prospect"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-stage" className="text-xs font-semibold">Etapa do Funil</Label>
                        <select
                          id="edit-stage"
                          value={editForm.stage}
                          onChange={(e) => updateEditField("stage", e.target.value)}
                          className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {CRM_LEAD_STAGE_VALUES.map((stage) => (
                            <option key={stage} value={stage}>
                              {CRM_STAGE_LABELS[stage]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-source" className="text-xs font-semibold">Origem</Label>
                        <select
                          id="edit-source"
                          value={editForm.source}
                          onChange={(e) => updateEditField("source", e.target.value)}
                          className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {CRM_LEAD_SOURCE_VALUES.map((src) => (
                            <option key={src} value={src}>
                              {CRM_SOURCE_LABELS[src]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Separator className="my-2" />

                    {/* CNPJ Lookup */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados Fiscais & CNPJ</p>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-document" className="text-xs font-semibold">CNPJ</Label>
                          <Input
                            id="edit-document"
                            value={editForm.document}
                            onChange={(e) => updateEditField("document", formatCNPJ(e.target.value))}
                            placeholder="00.000.000/0000-00"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 h-10 text-xs"
                            onClick={handleLookupCnpj}
                            disabled={isLookupLoading}
                          >
                            <FileSearch className="h-3.5 w-3.5" />
                            {isLookupLoading ? "Buscando..." : "Consultar CNPJ"}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-trade-name" className="text-xs font-semibold">Nome Fantasia</Label>
                          <Input
                            id="edit-trade-name"
                            value={editForm.tradeName}
                            onChange={(e) => updateEditField("tradeName", e.target.value)}
                            placeholder="Nome fantasia"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-industry" className="text-xs font-semibold">Segmento</Label>
                          <Input
                            id="edit-industry"
                            value={editForm.industry}
                            onChange={(e) => updateEditField("industry", e.target.value)}
                            placeholder="ERP, varejo, TI..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-city" className="text-xs font-semibold">Cidade</Label>
                          <Input
                            id="edit-city"
                            value={editForm.city}
                            onChange={(e) => updateEditField("city", e.target.value)}
                            placeholder="Cidade"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-state" className="text-xs font-semibold">UF</Label>
                          <Input
                            id="edit-state"
                            value={editForm.state}
                            onChange={(e) => updateEditField("state", e.target.value.toUpperCase())}
                            placeholder="UF"
                            maxLength={8}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Valores Comerciais */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valores Comerciais</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-estimated-value" className="text-xs font-semibold">Valor Total Estimado</Label>
                          <Input
                            id="edit-estimated-value"
                            type="number"
                            step="0.01"
                            value={editForm.estimatedValue}
                            onChange={(e) => updateEditField("estimatedValue", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-license-value" className="text-xs font-semibold">Valor da Licença</Label>
                          <Input
                            id="edit-license-value"
                            type="number"
                            step="0.01"
                            value={editForm.licenseValue}
                            onChange={(e) => updateEditField("licenseValue", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-monthly-fee" className="text-xs font-semibold">Valor da Mensalidade</Label>
                          <Input
                            id="edit-monthly-fee"
                            type="number"
                            step="0.01"
                            value={editForm.monthlyFee}
                            onChange={(e) => updateEditField("monthlyFee", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-minimum-wage" className="text-xs font-semibold">% Salário Mínimo</Label>
                          <Input
                            id="edit-minimum-wage"
                            type="number"
                            step="0.0001"
                            value={editForm.minimumWagePercentage}
                            onChange={(e) => updateEditField("minimumWagePercentage", e.target.value)}
                            placeholder="Ex.: 12.5"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-expected-close" className="text-xs font-semibold">Fechamento Previsto</Label>
                          <Input
                            id="edit-expected-close"
                            type="date"
                            value={editForm.expectedCloseAt}
                            onChange={(e) => updateEditField("expectedCloseAt", e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-next-step" className="text-xs font-semibold">Próximo Passo</Label>
                          <Input
                            id="edit-next-step"
                            value={editForm.nextStep}
                            onChange={(e) => updateEditField("nextStep", e.target.value)}
                            placeholder="Ex.: Agendar demo"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-notes" className="text-xs font-semibold">Notas de Qualificação</Label>
                        <Textarea
                          id="edit-notes"
                          value={editForm.qualificationNotes}
                          onChange={(e) => updateEditField("qualificationNotes", e.target.value)}
                          rows={4}
                          placeholder="Anote necessidades, dores, quantidade de usuários..."
                        />
                      </div>

                      {editForm.stage === "LOST" && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="edit-lost-reason" className="text-xs font-semibold text-destructive">Motivo da Perda</Label>
                          <Input
                            id="edit-lost-reason"
                            value={editForm.lostReason}
                            onChange={(e) => updateEditField("lostReason", e.target.value)}
                            placeholder="Por que perdemos essa oportunidade comercial?"
                            className="border-destructive/60"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-3">
                      <Button
                        type="button"
                        onClick={handleSaveForm}
                        disabled={isSavingForm}
                        className="w-full sm:w-auto h-10 px-6 gap-2"
                      >
                        {isSavingForm ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* TAB 2: CONTATOS */}
                <TabsContent value="contatos" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Contatos do Lead</p>
                      <p className="text-xs text-muted-foreground">Registre sócios, decisores ou usuários-chave.</p>
                    </div>
                    {editingContactIndex === null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingContactIndex(leadDetails.contacts.length);
                          setEditingContact({ ...EMPTY_CONTACT });
                        }}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    )}
                  </div>

                  {editingContactIndex !== null && editingContact ? (
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <p className="text-xs font-bold uppercase text-foreground">
                          {editingContactIndex < leadDetails.contacts.length ? "Editar Contato" : "Novo Contato"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingContactIndex(null);
                            setEditingContact(null);
                          }}
                          className="h-7 w-7 p-0 rounded-full"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Nome *</Label>
                          <Input
                            value={editingContact.name}
                            onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                            placeholder="Nome completo"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Cargo / Papel</Label>
                          <Input
                            value={editingContact.role || ""}
                            onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })}
                            placeholder="Ex.: Sócio, Diretor, TI"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">E-mail</Label>
                          <Input
                            value={editingContact.email || ""}
                            onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                            placeholder="email@empresa.com"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Telefone</Label>
                          <Input
                            value={editingContact.phone || ""}
                            onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                            placeholder="(00) 0000-0000"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">WhatsApp</Label>
                          <Input
                            value={editingContact.whatsapp || ""}
                            onChange={(e) => setEditingContact({ ...editingContact, whatsapp: e.target.value })}
                            placeholder="+55 (00) 00000-0000"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-[11px] font-semibold">Observações / Histórico de Contatos Efetuados</Label>
                          <Textarea
                            value={editingContact.notes || ""}
                            onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                            placeholder="Anote detalhes de conversas efetuadas, preferências do contato ou informações gerais."
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setEditingContactIndex(null);
                            setEditingContact(null);
                          }}
                          className="h-8 text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveContact}
                          className="h-8 text-xs"
                        >
                          Salvar Contato
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {leadDetails.contacts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
                        Nenhum contato manual cadastrado para este lead.
                      </div>
                    ) : (
                      leadDetails.contacts.map((contact, idx) => (
                        <div key={idx} className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/5 hover:bg-muted/10 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm text-foreground">{contact.name}</p>
                                {contact.isPrimary && (
                                  <Badge variant="secondary" className="text-[10px] scale-90 py-0 px-1.5 rounded-full">
                                    Principal
                                  </Badge>
                                )}
                              </div>
                              {contact.role && (
                                <p className="text-xs text-muted-foreground mt-0.5">{contact.role}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingContactIndex(idx);
                                  setEditingContact({ ...contact });
                                }}
                                className="h-7 w-7 p-0 rounded-full"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveContact(idx)}
                                className="h-7 w-7 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                            {contact.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {contact.whatsapp && (
                              <div className="flex items-center gap-1.5">
                                <PlayCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>WhatsApp: {contact.whatsapp}</span>
                              </div>
                            )}
                          </div>

                          {contact.notes && (
                            <div className="rounded-lg bg-muted/20 p-2.5 text-xs border border-border/60">
                              <p className="font-semibold text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Histórico / Obs:</p>
                              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* TAB 3: TIMELINE / HISTÓRICO */}
                <TabsContent value="atividades" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Nova Anotação ou Histórico Comercial</Label>
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={newActivityBody}
                        onChange={(e) => setNewActivityBody(e.target.value)}
                        placeholder="Anote detalhes de ligações, reuniões feitas, status comercial ou próximos passos..."
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleAddActivity}
                          disabled={isPostingActivity || !newActivityBody.trim()}
                          size="sm"
                          className="gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Registrar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linha do Tempo</p>
                    {activities.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
                        Nenhuma atividade registrada para este lead.
                      </div>
                    ) : (
                      <div className="relative pl-4 border-l border-border/60 space-y-5 py-2">
                        {activities.map((act) => {
                          const isSystem = act.type === "SYSTEM_EVENT";
                          return (
                            <div key={act.id} className="relative space-y-1">
                              {/* bullet dot */}
                              <div className={cn(
                                "absolute -left-[21.5px] top-1.5 h-3.5 w-3.5 rounded-full border border-background flex items-center justify-center shadow-sm",
                                isSystem ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                              )}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              </div>

                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-xs font-semibold text-foreground">
                                  {act.title || (isSystem ? "Evento de Sistema" : "Anotação Comercial")}
                                </p>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDateSafe(act.createdAt)}
                                </span>
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {act.body}
                              </p>

                              {act.authorName && (
                                <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                  Registrado por: {act.authorName}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 4: TAREFAS */}
                <TabsContent value="tarefas" className="mt-4 space-y-4">
                  <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-muted/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agendar Nova Tarefa</p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                      <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Ex.: Enviar proposta revisada"
                        className="h-9"
                      />
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="h-9 w-auto text-xs"
                      />
                      <Button
                        type="button"
                        onClick={handleCreateTask}
                        disabled={isCreatingTask || !newTaskTitle.trim()}
                        size="sm"
                        className="h-9 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agendar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tarefas Pendentes & Concluídas</p>
                    {tasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
                        Nenhuma tarefa agendada para este lead.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => {
                          const isCompleted = task.status === "COMPLETED";
                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60 transition-colors bg-muted/5",
                                isCompleted && "opacity-60 bg-muted/10"
                              )}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleTaskStatus(task)}
                                  className="h-5 w-5 p-0 rounded mt-0.5 hover:bg-muted"
                                >
                                  {isCompleted ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <div className="min-w-0">
                                  <p className={cn(
                                    "text-xs font-medium text-foreground truncate",
                                    isCompleted && "line-through text-muted-foreground"
                                  )}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Vence em: {formatDateSafe(task.dueDate)}
                                    </span>
                                    {task.assigneeName && (
                                      <span>Responsável: {task.assigneeName}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-7 w-7 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado encontrado para este lead.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isStageGuideOpen} onOpenChange={setIsStageGuideOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Como interpretar as etapas</DialogTitle>
            <DialogDescription>
              Este apoio reduz duvida operacional e ajuda o time a mover o lead no momento certo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {STAGE_GUIDE_ITEMS.map((stage) => (
              <div key={stage.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                  <Badge variant={stage.active ? "secondary" : "outline"}>
                    {stage.active ? "Etapa ativa" : "Resultado"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


function EmptyPipelineState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Nenhum lead cadastrado</h3>
          <p className="text-sm text-muted-foreground">
            Comece registrando a primeira oportunidade comercial para alimentar o funil.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/portal/comercial/leads/novo">
            Criar primeiro lead
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function FilteredEmptyState({
  search,
  statusLabel,
}: {
  search: string;
  statusLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
      <div className="mx-auto max-w-md space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Nenhum lead encontrado</h3>
        <p className="text-sm text-muted-foreground">
          {search.trim()
            ? `Nenhum registro de ${statusLabel} corresponde ao termo "${search.trim()}".`
            : `Nao ha registros disponiveis em ${statusLabel}.`}
        </p>
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  isSaving,
  onEdit,
  onStageChange,
  onDragStart,
  onDragEnd,
}: {
  lead: CrmLead;
  isSaving: boolean;
  onEdit: () => void;
  onStageChange: (stage: CrmLeadStage) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, leadId: string) => void;
  onDragEnd: () => void;
}) {
  const attention = getLeadAttentionState(lead);

  return (
    <div
      draggable={!isSaving}
      onDragStart={(event) => onDragStart(event, lead.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border border-border/60 bg-background p-3 shadow-sm transition-opacity",
        isSaving && "cursor-wait opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 rounded-md border border-border/60 p-1 text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">{lead.companyName}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{lead.title}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} disabled={isSaving}>
          <PencilLine className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2 text-xs text-muted-foreground">
        <LeadMeta icon={UserRound} text={resolveLeadContactName(lead)} />
        <LeadMeta text={CRM_SOURCE_LABELS[lead.source]} />
        <LeadMeta text={formatLeadCurrency(lead.estimatedValue)} />
        {lead.expectedCloseAt ? <LeadMeta text={`Fechamento: ${formatDateSafe(lead.expectedCloseAt)}`} /> : null}
        {lead.nextStep ? <LeadMeta text={lead.nextStep} /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {attention.isOverdue ? <LeadSignal tone="red" text="Fechamento atrasado" /> : null}
        {attention.isDueSoon ? <LeadSignal tone="amber" text="Fechando em breve" /> : null}
        {!attention.hasNextStep ? <LeadSignal tone="violet" text="Sem proximo passo" /> : null}
        {attention.isStale ? <LeadSignal tone="slate" text={`${attention.daysWithoutUpdate}d sem atualizacao`} /> : null}
      </div>

      <div className="mt-4 grid gap-2">
        <Select value={normalizeStageForSelect(lead.stage)} onValueChange={(value) => onStageChange(value as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger>
            <SelectValue placeholder="Mover etapa" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_SELECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ClosedLeadCard({
  lead,
  isSaving,
  onEdit,
  onStageChange,
}: {
  lead: CrmLead;
  isSaving: boolean;
  onEdit: () => void;
  onStageChange: (stage: CrmLeadStage) => void;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-muted/20 p-4", isSaving && "opacity-60")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lead.stage === "WON" ? "default" : "outline"}>{CRM_STAGE_LABELS[lead.stage]}</Badge>
            <Badge variant="secondary">{CRM_SOURCE_LABELS[lead.source]}</Badge>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{lead.companyName}</p>
            <p className="text-sm text-muted-foreground">{lead.title}</p>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onEdit} disabled={isSaving}>
          <PencilLine className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Contato</p>
          <p className="mt-1">{resolveLeadContactName(lead)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Valor</p>
          <p className="mt-1">{formatLeadCurrency(lead.estimatedValue)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Fechamento previsto</p>
          <p className="mt-1">{formatDateSafe(lead.expectedCloseAt, "Nao informado")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">{lead.stage === "LOST" ? "Motivo da perda" : "Proximo passo"}</p>
          <p className="mt-1">{lead.stage === "LOST" ? lead.lostReason || "Nao informado" : lead.nextStep || "Nao informado"}</p>
        </div>
      </div>

      <div className="mt-4">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mover para</Label>
        <Select value={normalizeStageForSelect(lead.stage)} onValueChange={(value) => onStageChange(value as CrmLeadStage)} disabled={isSaving}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_SELECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LeadMeta({
  icon: Icon,
  text,
}: {
  icon?: typeof UserRound;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
      <span className="line-clamp-2">{text}</span>
    </div>
  );
}

function LeadSignal({
  tone,
  text,
}: {
  tone: "red" | "amber" | "violet" | "slate";
  text: string;
}) {
  const toneClass = {
    red: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    slate: "border-border/60 bg-muted/40 text-muted-foreground",
  }[tone];

  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-medium", toneClass)}>{text}</span>;
}
