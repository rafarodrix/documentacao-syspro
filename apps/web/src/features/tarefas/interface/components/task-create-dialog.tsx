"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { trpc } from "@/lib/api/trpc-client";
import { useInternalUsers } from "@/features/tickets/interface/hooks/use-internal-users";
import { TicketCompanyPicker, type TicketCompanyPickerOption } from "@/features/tickets/interface/components/ticket-company-picker";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import type { TaskConfigView } from "@dosc-syspro/contracts/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
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
import { ClipboardPlus, UserRound } from "lucide-react";
import { toast } from "sonner";

const EMPTY_CONTACT_VALUE = "__none__";
const EMPTY_ASSIGNEE_VALUE = "__unassigned__";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialCompanyId?: string;
  lockCompany?: boolean;
}

function getCompanyLabel(company: CompanyOption) {
  return company.nomeFantasia?.trim() || company.razaoSocial;
}

function buildDefaultDueDateInput() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  return dueDate.toISOString().slice(0, 10);
}

function getAssignableUsers(users: ReturnType<typeof useInternalUsers>) {
  return users
    .filter((user) => {
      if (!user?.id) return false;
      return user.role === "SUPORTE" || user.role === "DEVELOPER" || user.role === "ADMIN";
    })
    .sort((left, right) => {
      const leftName = (left.name?.trim() || left.email).toLowerCase();
      const rightName = (right.name?.trim() || right.email).toLowerCase();
      return leftName.localeCompare(rightName);
    });
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  onCreated,
  initialCompanyId,
  lockCompany = false,
}: TaskCreateDialogProps) {
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
  const assignableUsers = useMemo(() => getAssignableUsers(users), [users]);
  const companyPickerOptions = useMemo<TicketCompanyPickerOption[]>(
    () =>
      companyOptions.map((company) => ({
        id: company.id,
        label: getCompanyLabel(company),
        description:
          company.nomeFantasia?.trim() && company.nomeFantasia.trim() !== company.razaoSocial.trim()
            ? company.razaoSocial
            : null,
        meta: "Empresa",
      })),
    [companyOptions],
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
    setCompanyId(initialCompanyId?.trim() || "");
    setSelectedCompanyConfig(null);
    setTitle("");
    setDescription("");
    setDueDate(buildDefaultDueDateInput());
    setAssignedToId(EMPTY_ASSIGNEE_VALUE);
    setClientContactId(EMPTY_CONTACT_VALUE);
    setRequiredDocumentsText("");
    setNotes("");
  }, [initialCompanyId, open]);

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
      <DialogContent className="sm:max-w-2xl [&>button]:hidden">
        <DialogHeader className="space-y-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardPlus className="h-4 w-4 text-primary" />
            Nova tarefa avulsa
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <section className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="space-y-2">
              <Label htmlFor="task-create-company" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Empresa
              </Label>
              <TicketCompanyPicker
                value={companyId}
                options={companyPickerOptions}
                onChange={setCompanyId}
                loading={isLoadingCompanies}
                disabled={lockCompany || isLoadingCompanies || isSubmitting}
                placeholder={isLoadingCompanies ? "Carregando empresas..." : "Selecione a empresa"}
                searchPlaceholder="Buscar empresa..."
                emptyMessage="Nenhuma empresa encontrada."
                className="h-10 bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-title" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Titulo
              </Label>
              <Input
                id="task-create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Atualizar parametrizacao apos validacao do cliente"
                disabled={isSubmitting}
                className="h-10 bg-background"
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-border/60 bg-muted/10 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-create-due-date" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Vencimento
              </Label>
              <Input
                id="task-create-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isSubmitting}
                className="h-10 bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-assignee" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Responsavel
              </Label>
              <Select value={assignedToId} onValueChange={setAssignedToId} disabled={isSubmitting}>
                <SelectTrigger id="task-create-assignee" className="h-10 bg-background">
                  <SelectValue placeholder="Sem responsavel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_ASSIGNEE_VALUE}>Sem responsavel</SelectItem>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{user.name?.trim() || user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-contact" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contato do cliente
              </Label>
              <Select
                value={clientContactId}
                onValueChange={setClientContactId}
                disabled={!companyId || isLoadingConfig || isSubmitting}
              >
                <SelectTrigger id="task-create-contact" className="h-10 bg-background">
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
              <Label htmlFor="task-create-checklist" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Checklist inicial
              </Label>
              <Textarea
                id="task-create-checklist"
                rows={4}
                value={requiredDocumentsText}
                onChange={(event) => setRequiredDocumentsText(event.target.value)}
                placeholder="Um item por linha ou separado por virgulas"
                disabled={isSubmitting}
                className="bg-background"
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="space-y-2">
              <Label htmlFor="task-create-description" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Descricao
              </Label>
              <Textarea
                id="task-create-description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contexto operacional, origem da demanda e proximo passo esperado."
                disabled={isSubmitting}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-create-notes" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Observacoes internas
              </Label>
              <Textarea
                id="task-create-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notas adicionais para a equipe interna."
                disabled={isSubmitting}
                className="bg-background"
              />
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-10">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="h-10 min-w-28">
            {isSubmitting ? "Criando..." : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
