"use client";

import type { FormEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toast } from "sonner";
import type { CrmActivity, CrmLead, CrmLeadManualContact, CrmTask } from "@dosc-syspro/contracts/crm";
import { trpc } from "@/lib/api/trpc-client";
import { onlyDigits } from "@/lib/utils";
import { formatCNPJ, isValidCnpj } from "@/lib/formatters";
import { lookupCompanyProfileByCnpjAction } from "@/features/company/application/company-write.actions";
import {
  DEFAULT_FORM_STATE,
  EMPTY_CONTACT,
  mapLeadToFormState,
  parseNullableNumber,
  type LeadFormState,
} from "../lead-management.types";
import { unwrapCollectionResponse } from "../lead-management.helpers";

type Deps = {
  setLeads: React.Dispatch<React.SetStateAction<CrmLead[]>>;
  router: AppRouterInstance;
  startTransition: React.TransitionStartFunction;
};

export function useLeadDetails({ setLeads, router, startTransition }: Deps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetails, setLeadDetailsRaw] = useState<CrmLead | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [editForm, setEditForm] = useState<LeadFormState>(DEFAULT_FORM_STATE);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  const [newActivityBody, setNewActivityBody] = useState("");
  const [newActivityType, setNewActivityType] = useState<"NOTE" | "CALL" | "MEETING" | "EMAIL" | "WHATSAPP">("NOTE");
  const [isPostingActivity, setIsPostingActivity] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<CrmLeadManualContact | null>(null);

  function setLeadDetails(lead: CrmLead | null | ((prev: CrmLead | null) => CrmLead | null)) {
    setLeadDetailsRaw((prev) => {
      const resolved = typeof lead === "function" ? lead(prev) : lead;
      return resolved ?? null;
    });
  }

  function updateEditField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  // Sync when a lead is updated from the board (stage change, drag-drop)
  function syncIfOpen(leadId: string, updated: CrmLead) {
    if (selectedLeadId === leadId) {
      setLeadDetails(updated);
      setEditForm(mapLeadToFormState(updated));
    }
  }

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

  async function handleSaveForm(event?: FormEvent<HTMLFormElement> | MouseEvent) {
    if (event) event.preventDefault();
    if (!leadDetails) return;
    if (!editForm.title.trim()) { toast.error("Informe o título do lead."); return; }
    if (!editForm.companyName.trim()) { toast.error("Informe a empresa potencial."); return; }

    setIsSavingForm(true);
    try {
        const result = await trpc.crm.update.mutate({
        id: leadDetails.id,
        data: {
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
        },
      });

      if (!result?.success || !result?.data) {
        toast.error(result?.error || result?.message || "Falha ao atualizar lead.");
        return;
      }

      const updated = result.data as CrmLead;
      setLeadDetails(updated);
      setLeads((current) => current.map((l) => (l.id === leadDetails.id ? updated : l)));
      toast.success("Lead atualizado com sucesso.");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      toast.error("Falha ao atualizar lead.");
    } finally {
      setIsSavingForm(false);
    }
  }

  async function handleLookupCnpj() {
    const normalizedCnpj = onlyDigits(editForm.document);
    if (normalizedCnpj.length !== 14) { toast.error("Informe um CNPJ completo."); return; }
    if (!isValidCnpj(normalizedCnpj)) { toast.error("Informe um CNPJ válido."); return; }
    setIsLookupLoading(true);
    try {
      const result = await lookupCompanyProfileByCnpjAction(normalizedCnpj);
      if (!result.success || !result.data?.profile) {
        toast.error(result.message || "Não foi possível consultar o CNPJ.");
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
      const res = await trpc.crm.createActivity.mutate({ leadId: leadDetails.id, type: newActivityType, body: newActivityBody.trim() });
      if (res.success) {
        setNewActivityBody("");
        setNewActivityType("NOTE");
        toast.success("Anotação adicionada!");
        const activitiesRes = await trpc.crm.listActivities.query({ leadId: leadDetails.id });
        setActivities(unwrapCollectionResponse<CrmActivity>(activitiesRes));
        startTransition(() => router.refresh());
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
      const res = await trpc.crm.updateTask.mutate({ id: task.id, data: { status: newStatus } });
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
    if (!newTaskTitle.trim() || !leadDetails) { toast.error("Informe o título da tarefa."); return; }
    setIsCreatingTask(true);
    try {
      const res = await trpc.crm.createTask.mutate({ leadId: leadDetails.id, title: newTaskTitle.trim(), dueDate: newTaskDueDate, status: "PENDING" });
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
      const res = await trpc.crm.update.mutate({ id: leadDetails.id, data: { contacts: updatedContacts } });
      if (res.success && res.data) {
        const updated = res.data as CrmLead;
        setLeadDetails(updated);
        setLeads((current) => current.map((l) => (l.id === leadDetails.id ? updated : l)));
        toast.success("Contatos atualizados.");
        startTransition(() => router.refresh());
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
    if (!editingContact.name.trim()) { toast.error("Nome do contato é obrigatório."); return; }
    const updatedContacts = [...leadDetails.contacts];
    const normalized: CrmLeadManualContact = {
      ...editingContact,
      name: editingContact.name.trim(),
      role: editingContact.role?.trim() || "",
      email: editingContact.email?.trim() || "",
      phone: editingContact.phone?.trim() || "",
      whatsapp: editingContact.whatsapp?.trim() || "",
      notes: editingContact.notes?.trim() || "",
    };
    if (editingContactIndex < updatedContacts.length) {
      updatedContacts[editingContactIndex] = normalized;
    } else {
      updatedContacts.push({ ...normalized, isPrimary: updatedContacts.length === 0 });
    }
    await handleSaveContacts(updatedContacts);
    setEditingContactIndex(null);
    setEditingContact(null);
  }

  async function handleRemoveContact(index: number) {
    if (!leadDetails) return;
    const updatedContacts = leadDetails.contacts.filter((_, idx) => idx !== index);
    if (updatedContacts.length > 0 && !updatedContacts.some((c) => c.isPrimary)) {
      updatedContacts[0].isPrimary = true;
    }
    await handleSaveContacts(updatedContacts);
  }

  return {
    selectedLeadId,
    setSelectedLeadId,
    leadDetails,
    activities,
    tasks,
    isLoadingDetails,
    editForm,
    updateEditField,
    isSavingForm,
    isLookupLoading,
    newActivityBody,
    setNewActivityBody,
    newActivityType,
    setNewActivityType,
    isPostingActivity,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDueDate,
    setNewTaskDueDate,
    isCreatingTask,
    editingContactIndex,
    setEditingContactIndex,
    editingContact,
    setEditingContact,
    syncIfOpen,
    handleSaveForm,
    handleLookupCnpj,
    handleAddActivity,
    handleToggleTaskStatus,
    handleCreateTask,
    handleDeleteTask,
    handleSaveContact,
    handleRemoveContact,
  };
}
