"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import {
  COMPANY_REMOTE_CONNECTION_TYPE_VALUES,
  type CreateCompanyInput,
} from "@dosc-syspro/contracts/company";
import type { TaskConfigUpsertInput, TaskConfigView } from "@dosc-syspro/contracts/tarefas";
import type { CompanyRemoteConnectionInput } from "@/features/company/application/company-view.types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Badge, Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { CompanyTaskConfigCard } from "@/features/tarefas/interface";
import { Server, Network, Plus, Trash2, Info } from "lucide-react";

const REMOTE_CONNECTION_LABEL: Record<CompanyRemoteConnectionInput["type"], string> = {
  DDNS_NOIP: "DDNS (NoIP)",
  RADMIN_VPN: "Radmin VPN",
};

interface CompanySettingsTabProps {
  taskConfigView?: TaskConfigView;
  canManageTasks?: boolean;
  taskConfigDraft?: TaskConfigUpsertInput["data"];
  onTaskConfigDraftChange?: (next: TaskConfigUpsertInput["data"]) => void;
}

export function CompanySettingsTab({
  taskConfigView,
  canManageTasks = false,
  taskConfigDraft,
  onTaskConfigDraftChange,
}: CompanySettingsTabProps) {
  const form = useFormContext<CreateCompanyInput>();
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

  const remoteConnectionsFieldArray = useFieldArray({
    control: form.control,
    name: "remoteConnections",
  });

  const remoteConnections = form.watch("remoteConnections") ?? [];
  const accountingFirmId = form.watch("accountingFirmId");

  return (
    <Tabs defaultValue="instalacao" className="space-y-5">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="instalacao">Acesso</TabsTrigger>
        <TabsTrigger value="rotinas-mensais">Tarefas</TabsTrigger>
      </TabsList>

      <TabsContent value="instalacao" className="space-y-6">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-3 p-4 md:p-5">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-1.5">
                <Server className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Runtime Syspro / IIS</p>
                <p className="text-xs text-muted-foreground">
                  Nao e mais configurado na empresa.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p>
                  Porta, diretorio e tipo <strong className="text-foreground">Syspro Server ou IIS</strong>{" "}
                  ficam em cada instalacao do dispositivo (aba ERP → Instalações).
                </p>
                <p>
                  Uma empresa pode ter varias instalacoes em maquinas/portas diferentes. A empresa do
                  cadastro continua sendo a <strong className="text-foreground">empresa principal</strong>{" "}
                  do host; o vinculo operacional por pasta/porta e feito na instalacao.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <Network className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Conexoes remotas</p>
                  <p className="text-xs text-muted-foreground">
                    DDNS, Radmin VPN, IP fixo ou nome da maquina. Voce pode cadastrar mais de uma.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => remoteConnectionsFieldArray.append({ type: "DDNS_NOIP", details: "" })}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {remoteConnections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-6 text-center text-muted-foreground">
                <Network className="h-6 w-6 opacity-40" />
                <p className="text-xs">Nenhuma conexao remota cadastrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {remoteConnectionsFieldArray.fields.map((fieldItem, index) => (
                  <div
                    key={fieldItem.id}
                    className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-border/60 text-[10px]">
                        {REMOTE_CONNECTION_LABEL[(remoteConnections[index]?.type as CompanyRemoteConnectionInput["type"]) ?? "DDNS_NOIP"]}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => remoteConnectionsFieldArray.remove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
                      <FormField
                        control={form.control}
                        name={`remoteConnections.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={toInputValue(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={COMPANY_REMOTE_CONNECTION_TYPE_VALUES[0]}>DDNS (NoIP)</SelectItem>
                                <SelectItem value={COMPANY_REMOTE_CONNECTION_TYPE_VALUES[1]}>Radmin VPN</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`remoteConnections.${index}.details`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome / IP / Identificacao</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex.: empresa.ddns.net, 26.x.x.x, nome da maquina..."
                                {...field}
                                value={toInputValue(field.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rotinas-mensais" className="space-y-6">
        {taskConfigView ? (
          <CompanyTaskConfigCard
            view={taskConfigView}
            canManage={canManageTasks}
            currentAccountingFirmId={typeof accountingFirmId === "string" ? accountingFirmId : ""}
            draft={taskConfigDraft ?? {
              isActive: taskConfigView.config.isActive,
              title: taskConfigView.config.title,
              dueDay: taskConfigView.config.dueDay,
              reminderDays: taskConfigView.config.reminderDays,
              clientContactId: taskConfigView.config.clientContactId,
              accountingContactId: taskConfigView.config.accountingContactId,
              assignedToId: taskConfigView.config.assignedToId,
              notes: taskConfigView.config.notes,
              requiredDocuments: taskConfigView.config.requiredDocuments,
            }}
            onDraftChange={onTaskConfigDraftChange ?? (() => undefined)}
          />
        ) : (
            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="p-5 text-sm text-muted-foreground">
              A configuracao de tarefas ficara disponivel apos carregar o contexto da empresa.
              </CardContent>
            </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
