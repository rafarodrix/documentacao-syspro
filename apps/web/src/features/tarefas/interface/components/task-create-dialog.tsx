"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { trpc } from "@/lib/api/trpc-client";
import { useInternalUsers } from "@/features/tickets/interface/hooks/use-internal-users";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import type { TaskConfigView } from "@dosc-syspro/contracts/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@dosc-syspro/ui";
import { ClipboardPlus } from "lucide-react";
import { toast } from "sonner";

const EMPTY_CONTACT_VALUE = "__none__";
const EMPTY_ASSIGNEE_VALUE = "__unassigned__";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function getCompanyLabel(company: CompanyOption) {
  return company.nomeFantasia?.trim() || company.razaoSocial;
}

function buildDefaultDueDateInput() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  return dueDate.toISOString().slice(0, 10);
}

export function TaskCreateDialog({ open, onOpenChange, onCreated }: TaskCreateDialogProps) {
  const users = useInternalUsers();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [selectedCompanyConfig, setSelectedCompanyConfig] = useState<TaskConfigView | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(buildDefaultDueDateInput);
  const [assignedToId, setAssignedToId] = useState(EMPTY_ASSIGNEE_VALUE);
  const [clientContactId, setClientContactId] = useState(EMPTY_CONTACT_VALUE);
  const [requiredDocumentsText, setRequiredDocumentsText] = useState("");
  const [notes, setNotes] = useState("");

  const availableContacts = selectedCompanyConfig?.clientContacts ?? [];
  const selectedCompany = useMemo(
    () => companyOptions.find((option) => option.id === companyId) ?? null,
    [companyId, companyOptions],
  );

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadCompanyOptions() {
      try {
        setIsLoadingCompanies(true);
        const result = await trpc.companies.getOptions.query();
        if (!active) return;
        setCompanyOptions(Array.isArray(result) ? (result as CompanyOption[]) : []);
      } catch {
        if (active) {
          setCompanyOptions([]);
          toast.error("Nao foi possivel carregar as empresas para criar a tarefa.");
        }
      } finally {
        if (active) {
          setIsLoadingCompanies(false);
        }
      }
    }

    void loadCompanyOptions();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCompanyId("");
    setSelectedCompanyConfig(null);
    setTitle("");
    setDescription("");
    setDueDate(buildDefaultDueDateInput());
    setAssignedToId(EMPTY_ASSIGNEE_VALUE);
    setClientContactId(EMPTY_CONTACT_VALUE);
    setRequiredDocumentsText("");
    setNotes("");
  }, [open]);

  useEffect(() => {
    if (!open || !companyId) {
      setSelectedCompanyConfig(null);
      setClientContactId(EMPTY_CONTACT_VALUE);
      return;
    }

    let active = true;

    async function loadCompanyConfig() {
      try {
        setIsLoadingConfig(true);
        const result = await trpc.tarefas.getCompanyConfig.query({ companyId });
        if (!active) return;
        setSelectedCompanyConfig(result);
        setClientContactId(result.config.clientContactId ?? EMPTY_CONTACT_VALUE);
      } catch {
        if (active) {
          setSelectedCompanyConfig(null);
          setClientContactId(EMPTY_CONTACT_VALUE);
          toast.error("Nao foi possivel carregar os contatos da empresa selecionada.");
        }
      } finally {
        if (active) {
          setIsLoadingConfig(false);
        }
      }
    }

    void loadCompanyConfig();

    return () => {
      active = false;
    };
  }, [companyId, open]);

  const handleSubmit = () => {
    if (!companyId) {
      toast.error("Selecione a empresa da tarefa.");
      return;
    }
    if (!title.trim()) {
      toast.error("Informe o titulo da tarefa.");
      return;
    }
    if (!dueDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    const requiredDocuments = requiredDocumentsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    startSubmitTransition(async () => {
      try {
        await trpc.tarefas.createTask.mutate({
          companyId,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
          clientContactId: clientContactId !== EMPTY_CONTACT_VALUE ? clientContactId : undefined,
          assignedToId: assignedToId !== EMPTY_ASSIGNEE_VALUE ? assignedToId : undefined,
          requiredDocuments,
          notes: notes.trim() || undefined,
        });

        toast.success("Tarefa criada com sucesso.");
        onOpenChange(false);
        onCreated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel criar a tarefa.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="h-4 w-4 text-primary" />
            Nova tarefa avulsa
          </DialogTitle>
          <DialogDescription>
            Crie uma tarefa manual para acompanhamento operacional, vinculando empresa, prazo e responsavel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-create-company">Empresa</Label>
              <Select value={companyId} onValueChange={setCompanyId} disabled={isLoadingCompanies || isSubmitting}>
                <SelectTrigger id="task-create-company">
                  <SelectValue placeholder={isLoadingCompanies ? "Carregando empresas..." : "Selecione a empresa"} />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {getCompanyLabel(company)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCompany ? (
                <p className="text-xs text-muted-foreground">
                  Empresa selecionada: {getCompanyLabel(selectedCompany)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-create-title">Titulo</Label>
              <Input
                id="task-create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Atualizar parametrizacao apos validacao do cliente"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-due-date">Vencimento</Label>
              <Input
                id="task-create-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-assignee">Responsavel</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId} disabled={isSubmitting}>
                <SelectTrigger id="task-create-assignee">
                  <SelectValue placeholder="Sem responsavel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_ASSIGNEE_VALUE}>Sem responsavel</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name?.trim() || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-contact">Contato do cliente</Label>
              <Select
                value={clientContactId}
                onValueChange={setClientContactId}
                disabled={!companyId || isLoadingConfig || isSubmitting}
              >
                <SelectTrigger id="task-create-contact">
                  <SelectValue placeholder={isLoadingConfig ? "Carregando contatos..." : "Selecione um contato"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_CONTACT_VALUE}>Sem contato vinculado</SelectItem>
                  {availableContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-checklist">Checklist inicial</Label>
              <Textarea
                id="task-create-checklist"
                rows={4}
                value={requiredDocumentsText}
                onChange={(event) => setRequiredDocumentsText(event.target.value)}
                placeholder="Um item por linha ou separado por virgulas"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-create-description">Descricao</Label>
              <Textarea
                id="task-create-description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contexto operacional, origem da demanda e proximo passo esperado."
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-create-notes">Observacoes internas</Label>
              <Textarea
                id="task-create-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notas adicionais para a equipe interna."
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
