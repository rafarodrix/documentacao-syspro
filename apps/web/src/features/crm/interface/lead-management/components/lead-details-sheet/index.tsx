"use client";

import type { FormEvent, MouseEvent } from "react";
import Link from "next/link";
import { Badge, Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { BadgeCheck, ExternalLink } from "lucide-react";
import type { CrmActivity, CrmLead, CrmLeadManualContact, CrmTask } from "@dosc-syspro/contracts/crm";
import { CRM_STAGE_LABELS } from "@/features/crm/domain/crm.types";
import type { LeadFormState } from "../../lead-management.types";
import { SheetDadosTab } from "./sheet-dados-tab";
import { SheetContatosTab } from "./sheet-contatos-tab";
import { SheetAtividadesTab } from "./sheet-atividades-tab";
import { SheetTarefasTab } from "./sheet-tarefas-tab";

type Props = {
  open: boolean;
  onClose: () => void;
  leadDetails: CrmLead | null;
  isLoadingDetails: boolean;
  activities: CrmActivity[];
  tasks: CrmTask[];
  // dados tab
  editForm: LeadFormState;
  updateEditField: <K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) => void;
  isSavingForm: boolean;
  isLookupLoading: boolean;
  onSaveForm: (event?: FormEvent<HTMLFormElement> | MouseEvent) => void;
  onLookupCnpj: () => void;
  // contatos tab
  editingContactIndex: number | null;
  editingContact: CrmLeadManualContact | null;
  setEditingContactIndex: (idx: number | null) => void;
  setEditingContact: (c: CrmLeadManualContact | null) => void;
  onSaveContact: () => void;
  onRemoveContact: (index: number) => void;
  // atividades tab
  newActivityBody: string;
  setNewActivityBody: (v: string) => void;
  newActivityType: "NOTE" | "CALL" | "MEETING" | "EMAIL" | "WHATSAPP";
  setNewActivityType: (type: "NOTE" | "CALL" | "MEETING" | "EMAIL" | "WHATSAPP") => void;
  isPostingActivity: boolean;
  onAddActivity: () => void;
  // tarefas tab
  newTaskTitle: string;
  setNewTaskTitle: (v: string) => void;
  newTaskDueDate: string;
  setNewTaskDueDate: (v: string) => void;
  isCreatingTask: boolean;
  onCreateTask: () => void;
  onToggleTaskStatus: (task: CrmTask) => void;
  onDeleteTask: (taskId: string) => void;
};

export function LeadDetailsSheet({
  open,
  onClose,
  leadDetails,
  isLoadingDetails,
  activities,
  tasks,
  editForm,
  updateEditField,
  isSavingForm,
  isLookupLoading,
  onSaveForm,
  onLookupCnpj,
  editingContactIndex,
  editingContact,
  setEditingContactIndex,
  setEditingContact,
  onSaveContact,
  onRemoveContact,
  newActivityBody,
  setNewActivityBody,
  newActivityType,
  setNewActivityType,
  isPostingActivity,
  onAddActivity,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDueDate,
  setNewTaskDueDate,
  isCreatingTask,
  onCreateTask,
  onToggleTaskStatus,
  onDeleteTask,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
            {leadDetails.convertedCompanyId && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm font-semibold text-foreground">Lead Convertido em Cliente!</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Uma empresa fiscal foi provisionada com sucesso a partir deste lead.</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 shrink-0">
                    <Link href="/portal/cadastros/empresa">
                      Ver empresa <ExternalLink className="h-3 w-3" />
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

              <TabsContent value="dados" className="mt-4 space-y-4">
                <SheetDadosTab
                  editForm={editForm}
                  updateEditField={updateEditField}
                  isSavingForm={isSavingForm}
                  isLookupLoading={isLookupLoading}
                  onSave={onSaveForm}
                  onLookupCnpj={onLookupCnpj}
                />
              </TabsContent>

              <TabsContent value="contatos" className="mt-4 space-y-4">
                <SheetContatosTab
                  leadDetails={leadDetails}
                  editingContactIndex={editingContactIndex}
                  editingContact={editingContact}
                  setEditingContactIndex={setEditingContactIndex}
                  setEditingContact={setEditingContact}
                  onSaveContact={onSaveContact}
                  onRemoveContact={onRemoveContact}
                />
              </TabsContent>

              <TabsContent value="atividades" className="mt-4 space-y-4">
                <SheetAtividadesTab
                  activities={activities}
                  newActivityBody={newActivityBody}
                  setNewActivityBody={setNewActivityBody}
                  newActivityType={newActivityType}
                  setNewActivityType={setNewActivityType}
                  isPostingActivity={isPostingActivity}
                  onAddActivity={onAddActivity}
                />
              </TabsContent>

              <TabsContent value="tarefas" className="mt-4 space-y-4">
                <SheetTarefasTab
                  tasks={tasks}
                  newTaskTitle={newTaskTitle}
                  setNewTaskTitle={setNewTaskTitle}
                  newTaskDueDate={newTaskDueDate}
                  setNewTaskDueDate={setNewTaskDueDate}
                  isCreatingTask={isCreatingTask}
                  onCreateTask={onCreateTask}
                  onToggleTaskStatus={onToggleTaskStatus}
                  onDeleteTask={onDeleteTask}
                />
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
  );
}
