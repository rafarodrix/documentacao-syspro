"use client";

import { useMemo } from "react";
import type { TaskConfigUpsertInput, TaskConfigView } from "@dosc-syspro/contracts/tarefas";
import { useInternalUsers } from "@/features/tickets/interface/hooks/use-internal-users";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from "@dosc-syspro/ui";
import { CalendarRange, TriangleAlert, UserRound } from "lucide-react";

const EMPTY_ASSIGNEE_VALUE = "__unassigned__";

interface CompanyTaskConfigCardProps {
  view: TaskConfigView;
  canManage: boolean;
  currentAccountingFirmId?: string;
  draft: TaskConfigUpsertInput["data"];
  onDraftChange: (next: TaskConfigUpsertInput["data"]) => void;
}

export function CompanyTaskConfigCard({
  view,
  canManage,
  currentAccountingFirmId,
  draft,
  onDraftChange,
}: CompanyTaskConfigCardProps) {
  const users = useInternalUsers();
  const accountingFirmChangedInForm = useMemo(() => {
    if (typeof currentAccountingFirmId !== "string") return false;
    const normalizedCurrent = currentAccountingFirmId.trim();
    const normalizedSaved = (view.company.accountingFirmId ?? "").trim();
    return normalizedCurrent !== normalizedSaved;
  }, [currentAccountingFirmId, view.company.accountingFirmId]);
  const assignableUsers = useMemo(
    () =>
      users
        .filter((user) => user?.id && (user.role === "SUPORTE" || user.role === "DEVELOPER" || user.role === "ADMIN"))
        .sort((left, right) => {
          const leftName = (left.name?.trim() || left.email).toLowerCase();
          const rightName = (right.name?.trim() || right.email).toLowerCase();
          return leftName.localeCompare(rightName);
        }),
    [users],
  );

  const requiredDocumentsText = draft.requiredDocuments.join("\n");

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Rotina Mensal</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {accountingFirmChangedInForm ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                O escritorio contabil foi alterado no formulario da empresa e ainda nao foi salvo. Salve a empresa para atualizar os contatos da contabilidade nesta rotina.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Participa da rotina mensal</p>
            <p className="text-xs text-muted-foreground">
              Use esta chave para incluir ou retirar a empresa da geracao recorrente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                draft.isActive ? "text-emerald-400" : "text-muted-foreground"
              }`}
            >
              {draft.isActive ? "Ligada" : "Desligada"}
            </span>
            <Switch
              checked={draft.isActive}
              disabled={!canManage}
              className="h-7 w-12 border border-border/80 bg-muted data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-zinc-700"
              onCheckedChange={(checked) => onDraftChange({ ...draft, isActive: checked })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Titulo da rotina</Label>
            <Input
              value={draft.title}
              disabled={!canManage}
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              placeholder="Ex.: Envio mensal contabil"
            />
          </div>

          <div className="space-y-2">
            <Label>Contato principal do cliente</Label>
            <Select
              value={draft.clientContactId ?? "__none__"}
              disabled={!canManage}
              onValueChange={(value) =>
                onDraftChange({ ...draft, clientContactId: value === "__none__" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nao definido</SelectItem>
                {view.clientContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tecnico responsavel pela rotina</Label>
            <Select
              value={draft.assignedToId ?? EMPTY_ASSIGNEE_VALUE}
              disabled={!canManage}
              onValueChange={(value) =>
                onDraftChange({ ...draft, assignedToId: value === EMPTY_ASSIGNEE_VALUE ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem responsavel fixo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_ASSIGNEE_VALUE}>Sem responsavel fixo</SelectItem>
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
            <Label>Dia limite</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={String(draft.dueDay)}
              disabled={!canManage}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  dueDay: Math.min(31, Math.max(1, Number(event.target.value || draft.dueDay))),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Apos o dia {draft.dueDay}, a competencia passa automaticamente para atrasada.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Antecedencia do aviso (dias)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={String(draft.reminderDays)}
              disabled={!canManage}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  reminderDays: Math.min(30, Math.max(0, Number(event.target.value || draft.reminderDays))),
                })
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Contato da contabilidade</Label>
            <Select
              value={draft.accountingContactId ?? "__none__"}
              disabled={!canManage || accountingFirmChangedInForm}
              onValueChange={(value) =>
                onDraftChange({ ...draft, accountingContactId: value === "__none__" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato contabil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nao definido</SelectItem>
                {view.accountingContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!view.accountingContacts.length ? (
              <p className="text-xs text-muted-foreground">
                Nenhum contato encontrado no escritorio contabil atualmente vinculado.
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Checklist padrao de documentos</Label>
          <Textarea
            value={requiredDocumentsText}
            disabled={!canManage}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                requiredDocuments: event.target.value
                  .split(/\r?\n/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder={"Digite um item por linha\nEx.: XML de vendas\nRelatorio de caixa\nMovimento de estoque"}
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Observacoes operacionais</Label>
          <Textarea
            value={draft.notes ?? ""}
            disabled={!canManage}
            onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
            placeholder="Instrucoes para a equipe, excecoes do cliente e combinados com a contabilidade."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
