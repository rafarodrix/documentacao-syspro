"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { trpc } from "@/lib/api/trpc-client";
import { CompanyPicker, type CompanyPickerOption } from "@/components/platform/shared/company-picker";
import type { TaskCompanySearchOption, TaskConfigView, TaskContactOption } from "@dosc-syspro/contracts/tarefas";
import { useInternalUsers } from "@/features/user-access/interface/hooks/use-internal-users";
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

function buildDefaultDueDateInputs() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  return {
    date: dueDate.toISOString().slice(0, 10),
    time: "09:00",
  };
}

function encodePickerPart(value?: string | null) {
  return encodeURIComponent((value || "").trim());
}

function buildPickerValue(input: Pick<TaskCompanySearchOption, "companyId" | "email" | "contactName">) {
  return [
    encodePickerPart(input.companyId),
    encodePickerPart(input.email),
    encodePickerPart(input.contactName),
  ].join("::");
}

function parsePickerValue(value: string) {
  const [companyId = "", email = "", contactName = ""] = value
    .split("::")
    .map((part) => decodeURIComponent(part || ""));

  return {
    companyId: companyId.trim(),
    email: email.trim().toLowerCase(),
    contactName: contactName.trim(),
  };
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
  const [isLoadingCompanyOptions, setIsLoadingCompanyOptions] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companyOptionsError, setCompanyOptionsError] = useState<string | null>(null);
  const [customerOptions, setCustomerOptions] = useState<TaskCompanySearchOption[]>([]);
  const [selectedCompanyConfig, setSelectedCompanyConfig] = useState<TaskConfigView | null>(null);
  const [selectedCompanyOptionValue, setSelectedCompanyOptionValue] = useState("");
  const [selectedContactEmail, setSelectedContactEmail] = useState("");
  const [contactAutoSelected, setContactAutoSelected] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => buildDefaultDueDateInputs().date);
  const [dueTime, setDueTime] = useState(() => buildDefaultDueDateInputs().time);
  const [assignedToId, setAssignedToId] = useState(EMPTY_ASSIGNEE_VALUE);
  const [clientContactId, setClientContactId] = useState(EMPTY_CONTACT_VALUE);
  const [requiredDocumentsText, setRequiredDocumentsText] = useState("");
  const [notes, setNotes] = useState("");

  const availableContacts = selectedCompanyConfig?.clientContacts ?? [];
  const assignableUsers = useMemo(() => getAssignableUsers(users), [users]);
  const selectedCustomerOption = useMemo(
    () => customerOptions.find((option) => buildPickerValue(option) === selectedCompanyOptionValue) ?? null,
    [customerOptions, selectedCompanyOptionValue],
  );
  const companyPickerOptions = useMemo<CompanyPickerOption[]>(
    () => {
      const options = customerOptions.map((option) => {
        const hasContact = Boolean(option.contactName?.trim());
        const companySupportText = [option.companyName, option.legalName, option.cnpj].filter(Boolean).join(" | ");
        const contactSupportText = [option.legalName, option.cnpj, option.email].filter(Boolean).join(" | ");

        return {
          id: buildPickerValue(option),
          label: hasContact ? option.contactName || option.companyName : option.companyName,
          description: hasContact ? companySupportText : [option.legalName, option.cnpj].filter(Boolean).join(" | "),
          meta: hasContact ? contactSupportText : null,
          kind: hasContact ? "contact" : "company",
        } satisfies CompanyPickerOption;
      });

      if (
        companyId &&
        selectedCompanyOptionValue &&
        !options.some((option) => option.id === selectedCompanyOptionValue)
      ) {
        options.push({
          id: selectedCompanyOptionValue,
          label:
            selectedCustomerOption?.contactName?.trim() ||
            selectedCustomerOption?.companyName ||
            selectedCompanyConfig?.company.companyName ||
            "Empresa selecionada",
          description:
            selectedCustomerOption?.contactName?.trim()
              ? [
                  selectedCustomerOption.companyName,
                  selectedCustomerOption.legalName,
                  selectedCustomerOption.cnpj,
                ]
                  .filter(Boolean)
                  .join(" | ")
              : [selectedCustomerOption?.legalName, selectedCustomerOption?.cnpj].filter(Boolean).join(" | "),
          meta:
            selectedCustomerOption?.contactName?.trim()
              ? [selectedCustomerOption.legalName, selectedCustomerOption.cnpj, selectedCustomerOption.email]
                  .filter(Boolean)
                  .join(" | ")
              : null,
          kind: selectedCustomerOption?.contactName?.trim() ? "contact" : "company",
        });
      }

      return options;
    },
    [
      companyId,
      customerOptions,
      selectedCompanyConfig?.company.companyName,
      selectedCompanyOptionValue,
      selectedCustomerOption,
    ],
  );

  useEffect(() => {
    if (!open) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsLoadingCompanyOptions(true);
        setCompanyOptionsError(null);

        const params = new URLSearchParams();
        params.set("q", companySearchQuery.trim());
        params.set("limit", "15");

        const result = await trpc.tarefas.searchCompanyOptions.query({
          q: params.get("q") || "",
          limit: Number(params.get("limit") || "15"),
        });
        if (!active) return;
        setCustomerOptions(Array.isArray(result.options) ? result.options : []);
      } catch (error) {
        if (active) {
          setCompanyOptionsError(error instanceof Error ? error.message : "Falha ao consultar empresas e contatos.");
          setCustomerOptions([]);
        }
      } finally {
        if (active) {
          setIsLoadingCompanyOptions(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [companySearchQuery, open]);

  useEffect(() => {
    if (!open) return;
    setCompanyId(initialCompanyId?.trim() || "");
    setSelectedCompanyOptionValue(
      initialCompanyId?.trim()
        ? buildPickerValue({ companyId: initialCompanyId.trim(), email: "", contactName: "" })
        : "",
    );
    setSelectedContactEmail("");
    setContactAutoSelected(false);
    setCompanySearchQuery("");
    setCompanyOptionsError(null);
    setSelectedCompanyConfig(null);
    setTitle("");
    setDescription("");
    const defaultDueDate = buildDefaultDueDateInputs();
    setDueDate(defaultDueDate.date);
    setDueTime(defaultDueDate.time);
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
        if (selectedContactEmail) {
          const matchedContact = result.clientContacts.find(
            (contact: TaskContactOption) => contact.email?.trim().toLowerCase() === selectedContactEmail,
          );
          setContactAutoSelected(Boolean(matchedContact));
          setClientContactId(matchedContact?.id ?? result.config.clientContactId ?? EMPTY_CONTACT_VALUE);
          return;
        }
        setContactAutoSelected(false);
        setClientContactId(result.config.clientContactId ?? EMPTY_CONTACT_VALUE);
      } catch {
        if (active) {
          setSelectedCompanyConfig(null);
          setContactAutoSelected(false);
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
  }, [companyId, open, selectedContactEmail]);

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
    if (!dueTime) {
      toast.error("Informe a hora de vencimento.");
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
          dueDate: new Date(`${dueDate}T${dueTime}:00`).toISOString(),
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
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-create-company" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Empresa ou contato
              </Label>
              <CompanyPicker
                value={selectedCompanyOptionValue}
                options={companyPickerOptions}
                onChange={(value) => {
                  const parsed = parsePickerValue(value);
                  setSelectedCompanyOptionValue(value);
                  setCompanyId(parsed.companyId);
                  setSelectedContactEmail(parsed.contactName ? parsed.email : "");
                  setContactAutoSelected(false);
                }}
                onSearch={setCompanySearchQuery}
                loading={isLoadingCompanyOptions}
                disabled={lockCompany || isSubmitting}
                placeholder={isLoadingCompanyOptions ? "Carregando empresas..." : "Pesquisar empresa ou contato"}
                searchPlaceholder="Buscar empresa, razao social, CNPJ ou contato..."
                emptyMessage={companyOptionsError || "Nenhum resultado encontrado."}
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

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-create-due-date" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Data de vencimento
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
              <Label htmlFor="task-create-due-time" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hora de vencimento
              </Label>
              <Input
                id="task-create-due-time"
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
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
                Contato para retorno
              </Label>
              {contactAutoSelected ? (
                <p className="text-[11px] text-muted-foreground">
                  Preenchido automaticamente a partir do contato selecionado na busca.
                </p>
              ) : null}
              <Select
                value={clientContactId}
                onValueChange={(value) => {
                  setClientContactId(value);
                  setContactAutoSelected(false);
                }}
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

          <section className="grid gap-4 border-t border-border/50 pt-4">
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
