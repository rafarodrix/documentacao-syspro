"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useFieldArray, useForm, type FieldPath, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertCircle,
  Clock,
  FolderKanban,
  Layers3,
  Loader2,
  MessageSquareText,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  ticketModuleSettingsSchema,
  type TicketNotificationGroup,
  type TicketModuleSettings,
} from "@dosc-syspro/contracts/ticket";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildModuleHierarchyValue, getModuleHierarchyDepth, normalizeModuleHierarchyLabel } from "@/features/tickets/interface/lib/ticket-module-hierarchy";

function createOptionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createNotificationGroup(label = ""): TicketNotificationGroup {
  return {
    id: createOptionId("group"),
    label,
    jid: "",
    active: true,
  };
}

const ticketSettingsResolver = zodResolver(ticketModuleSettingsSchema) as Resolver<TicketModuleSettings>;

function getCategoryTypeOptions(team?: string) {
  if (team === "DESENVOLVIMENTO") {
    return [
      { value: "BUG", label: "Bug" },
      { value: "MELHORIA", label: "Melhoria" },
      { value: "NOVA_FUNCIONALIDADE", label: "Nova Funcionalidade" },
    ] as const;
  }

  return [{ value: "SUPORTE", label: "Suporte" }] as const;
}

function normalizeTicketSettings(settings: TicketModuleSettings): TicketModuleSettings {
  const legacySupportGroupJid = (settings as TicketModuleSettings & { supportNotificationGroupJid?: string }).supportNotificationGroupJid;
  const legacyDevelopmentGroupJid =
    (settings as TicketModuleSettings & { developmentNotificationGroupJid?: string }).developmentNotificationGroupJid;

  return {
    ...settings,
    quickReplyTemplates: settings.quickReplyTemplates ?? DEFAULT_TICKET_MODULE_SETTINGS.quickReplyTemplates,
    supportNotificationGroups:
      settings.supportNotificationGroups?.length
        ? settings.supportNotificationGroups
        : legacySupportGroupJid?.trim()
          ? [{ ...createNotificationGroup("Grupo legado de suporte"), jid: legacySupportGroupJid.trim() }]
          : [],
    developmentNotificationGroups:
      settings.developmentNotificationGroups?.length
        ? settings.developmentNotificationGroups
        : legacyDevelopmentGroupJid?.trim()
          ? [{ ...createNotificationGroup("Grupo legado de desenvolvimento"), jid: legacyDevelopmentGroupJid.trim() }]
          : [],
    modules: settings.modules.map((moduleOption) => ({
      ...moduleOption,
      label: normalizeModuleHierarchyLabel(moduleOption.label) || moduleOption.label,
      value: moduleOption.value?.trim() || buildModuleHierarchyValue(moduleOption.label),
    })),
    priorities: settings.priorities.map((priority) => {
      const resolutionMinutes = priority.resolutionMinutes ?? priority.slaHours * 60;
      return {
        ...priority,
        firstResponseMinutes: priority.firstResponseMinutes ?? Math.max(15, Math.min(240, Math.ceil(resolutionMinutes / 24))),
        resolutionMinutes,
        slaHours: Math.max(1, Math.ceil(resolutionMinutes / 60)),
      };
    }),
  };
}

export function TicketSettingsTab() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<TicketModuleSettings>({
    resolver: ticketSettingsResolver,
    defaultValues: normalizeTicketSettings(DEFAULT_TICKET_MODULE_SETTINGS),
  });

  const categoriesArray = useFieldArray({ control: form.control, name: "categories" });
  const teamsArray = useFieldArray({ control: form.control, name: "teams" });
  const modulesArray = useFieldArray({ control: form.control, name: "modules" });
  const prioritiesArray = useFieldArray({ control: form.control, name: "priorities" });
  const templatesArray = useFieldArray({ control: form.control, name: "quickReplyTemplates" });
  const supportNotificationGroupsArray = useFieldArray({ control: form.control, name: "supportNotificationGroups" });
  const developmentNotificationGroupsArray = useFieldArray({ control: form.control, name: "developmentNotificationGroups" });

  const priorities = form.watch("priorities");
  const defaultTeam = form.watch("defaultTeam");
  const defaultPriority = form.watch("defaultPriority");
  const autoResponseEnabled = form.watch("autoResponseEnabled");

  useEffect(() => {
    let active = true;

    fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
        if (!active) return;
        if (json.success && json.data) {
          form.reset(normalizeTicketSettings(json.data));
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar configuracoes de tickets:", error);
        toast.error("Nao foi possivel carregar as configuracoes de tickets.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form]);

  function onSubmit(data: TicketModuleSettings) {
    startTransition(async () => {
      try {
        const payload = normalizeTicketSettings(data);
        const response = await fetch("/api/platform/settings/tickets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as { success?: boolean; message?: string; error?: string };
        if (!result.success) {
          toast.error(result.error || "Erro ao salvar configuracoes.");
          return;
        }

        toast.success(result.message || "Configuracoes do modulo de tickets salvas.");
        form.reset(payload);
      } catch (error) {
        console.error("Erro ao salvar configuracoes:", error);
        toast.error("Processo falhou.");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="border-border/60">
          <CardContent className="space-y-4 p-5">
            <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-32 animate-pulse rounded-lg bg-muted/70" />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="space-y-4 p-5">
            <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted/70" />
            <div className="h-10 animate-pulse rounded-md bg-muted/70" />
            <div className="h-10 animate-pulse rounded-md bg-muted/70" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 animate-in fade-in duration-500">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              void form.handleSubmit(onSubmit)();
            }
          }}
          className="space-y-5 pb-10"
        >
          <section className="min-w-0 space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Configuracoes de tickets</h2>
              <p className="text-sm text-muted-foreground">Ajuste catalogos, SLA e respostas rapidas usados no cadastro e na edicao de chamados.</p>
            </div>

            <Card className="border-border/60 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Resumo operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Fila padrao" value={defaultTeam === "DESENVOLVIMENTO" ? "Desenvolvimento" : "Suporte"} />
                  <Metric label="Prioridade" value={priorities.find((priority) => priority.value === defaultPriority)?.label || defaultPriority} />
                  <Metric
                    label="Grupos suporte"
                    value={String(form.watch("supportNotificationGroups")?.filter((group) => group.active).length || 0)}
                  />
                  <Metric
                    label="Grupos dev"
                    value={String(form.watch("developmentNotificationGroups")?.filter((group) => group.active).length || 0)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Metric label="Categorias" value={categoriesArray.fields.length} />
                  <Metric label="Equipes" value={teamsArray.fields.length} />
                  <Metric label="Modulos" value={modulesArray.fields.length} />
                  <Metric label="Templates" value={templatesArray.fields.length} />
                </div>
                {form.formState.isDirty && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Existem alteracoes pendentes.
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="catalog" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-transparent p-0 md:grid-cols-5">
                <TabsTrigger value="catalog" className="gap-1.5 text-xs">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Categorias
                </TabsTrigger>
                <TabsTrigger value="structure" className="gap-1.5 text-xs">
                  <Layers3 className="h-3.5 w-3.5" />
                  Estrutura
                </TabsTrigger>
                <TabsTrigger value="sla" className="gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  SLA
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-1.5 text-xs">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="automation" className="gap-1.5 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Automacao
                </TabsTrigger>
              </TabsList>

              <TabsContent value="catalog" className="mt-5 space-y-5">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FolderKanban className="h-4 w-4 text-primary/70" />
                        Categorias e roteamento
                      </CardTitle>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => categoriesArray.append({ id: createOptionId("cat"), label: "", value: "", defaultTeam: "SUPORTE", type: "SUPORTE" })}>
                        <Plus className="h-3.5 w-3.5" />
                        Categoria
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoriesArray.fields.map((fieldItem, index) => (
                      <div key={fieldItem.id} className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_11rem_12rem_2.5rem]">
                        <div className="space-y-2">
                          <FormField control={form.control} name={`categories.${index}.label`} render={({ field }) => (
                            <FormItem>
                              <FormControl><Input placeholder="Nome da categoria" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`categories.${index}.description`} render={({ field }) => (
                            <FormItem>
                              <FormControl><Input placeholder="Descricao operacional" className="h-8 text-xs" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name={`categories.${index}.value`} render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="slug" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`categories.${index}.defaultTeam`} render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue(`categories.${index}.type`, value === "DESENVOLVIMENTO" ? "BUG" : "SUPORTE", { shouldDirty: true });
                            }} value={field.value || "SUPORTE"}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Fila" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SUPORTE">Suporte</SelectItem>
                                <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`categories.${index}.type`} render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getCategoryTypeOptions(form.watch(`categories.${index}.defaultTeam`)).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => categoriesArray.remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

              </TabsContent>

              <TabsContent value="structure" className="mt-5 space-y-5">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Layers3 className="h-4 w-4 text-primary/70" />
                      Estrutura operacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 xl:grid-cols-2">
                    <CatalogList
                      title="Equipes"
                      onAdd={() => teamsArray.append({ id: createOptionId("team"), label: "", value: "" })}
                    >
                      {teamsArray.fields.map((fieldItem, index) => (
                        <CompactOptionRow
                          key={fieldItem.id}
                          labelName={`teams.${index}.label`}
                          valueName={`teams.${index}.value`}
                          labelPlaceholder="Equipe"
                          valuePlaceholder="SLUG"
                          onRemove={() => teamsArray.remove(index)}
                          form={form}
                        />
                      ))}
                    </CatalogList>

                    <CatalogList
                      title="Modulos"
                      onAdd={() => modulesArray.append({ id: createOptionId("mod"), label: "", value: "" })}
                      description="Use a hierarquia com > para refletir modulo, submenu e tela. Ex: Financeiro > Contas > Contas Bancarias."
                    >
                      {modulesArray.fields.map((fieldItem, index) => (
                        <ModuleOptionRow
                          key={fieldItem.id}
                          labelName={`modules.${index}.label`}
                          valueName={`modules.${index}.value`}
                          labelPlaceholder="Financeiro > Contas > Contas Bancarias"
                          valuePlaceholder="financeiro/contas/contas-bancarias"
                          onRemove={() => modulesArray.remove(index)}
                          form={form}
                        />
                      ))}
                    </CatalogList>

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sla" className="mt-5">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary/70" />
                        Politicas de SLA por prioridade
                      </CardTitle>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => prioritiesArray.append({ id: createOptionId("priority"), label: "", value: "", slaHours: 24, firstResponseMinutes: 60, resolutionMinutes: 1440 })}>
                        <Plus className="h-3.5 w-3.5" />
                        Prioridade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {prioritiesArray.fields.map((fieldItem, index) => (
                      <div key={fieldItem.id} className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_10rem_2.5rem]">
                        <FormField control={form.control} name={`priorities.${index}.label`} render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="Nome da prioridade" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`priorities.${index}.value`} render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="valor" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`priorities.${index}.firstResponseMinutes`} render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <LabeledNumberInput label="1a resp." value={field.value ?? ""} min={1} max={10080} onChange={(value) => field.onChange(value)} />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`priorities.${index}.resolutionMinutes`} render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <LabeledNumberInput
                                label="resol."
                                value={field.value ?? ""}
                                min={1}
                                max={43200}
                                onChange={(value) => {
                                  field.onChange(value);
                                  form.setValue(`priorities.${index}.slaHours`, Math.max(1, Math.ceil(value / 60)), { shouldDirty: true });
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => prioritiesArray.remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="templates" className="mt-5">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <MessageSquareText className="h-4 w-4 text-primary/70" />
                        Respostas rapidas do atendimento
                      </CardTitle>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => templatesArray.append({ id: createOptionId("template"), label: "", value: "" })}>
                        <Plus className="h-3.5 w-3.5" />
                        Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {templatesArray.fields.map((fieldItem, index) => (
                      <div key={fieldItem.id} className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_2.5rem]">
                        <FormField control={form.control} name={`quickReplyTemplates.${index}.label`} render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="Nome do template" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`quickReplyTemplates.${index}.value`} render={({ field }) => (
                          <FormItem>
                            <FormControl><Textarea rows={2} placeholder="Texto que sera inserido no editor" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => templatesArray.remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="automation" className="mt-5 space-y-5">
                <Tabs defaultValue="rules" className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-transparent p-0 md:w-fit">
                    <TabsTrigger value="rules" className="gap-1.5 text-xs">
                      <Settings2 className="h-3.5 w-3.5" />
                      Regras
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-1.5 text-xs">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      Notificacoes WhatsApp
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="rules" className="mt-5 space-y-5">
                    <Card className="border-border/60 bg-card/95">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Settings2 className="h-4 w-4 text-primary/70" />
                          Regras gerais
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 xl:grid-cols-2">
                        <FormField control={form.control} name="defaultTeam" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fila padrao</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="SUPORTE">Suporte</SelectItem>
                                <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="defaultPriority" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade inbound</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {priorities.map((priority) => (
                                  <SelectItem key={priority.id} value={priority.value}>{priority.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/95">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Automacoes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField control={form.control} name="autoAssignToCreator" render={({ field }) => (
                          <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Auto-atribuir internos</FormLabel>
                              <FormDescription className="text-xs">Operador vira responsavel ao abrir chamado pelo portal.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="autoResponseEnabled" render={({ field }) => (
                          <FormItem className="rounded-lg border border-border/60 bg-muted/10 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <FormLabel>Auto resposta</FormLabel>
                                <FormDescription className="text-xs">Mensagem enviada na abertura pelo cliente.</FormDescription>
                              </div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </div>
                          </FormItem>
                        )} />

                        {autoResponseEnabled && (
                          <FormField control={form.control} name="autoResponseMessage" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensagem automatica</FormLabel>
                              <FormControl><Textarea rows={4} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-5">
                    <Card className="border-border/60 bg-card/95">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Notificacoes de abertura</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Grupos de notificacao no WhatsApp</h3>
                          <p className="text-xs text-muted-foreground">
                            O envio usa o identificador real do grupo no WhatsApp. Preencha o ID/JID do grupo, por exemplo <span className="font-mono">1203630...@g.us</span>.
                          </p>
                        </div>

                        <NotificationGroupsSection
                          title="Grupos do Suporte"
                          description="Recebem tickets abertos com fila em Suporte."
                          fields={supportNotificationGroupsArray.fields}
                          baseName="supportNotificationGroups"
                          form={form}
                          onAdd={() => supportNotificationGroupsArray.append(createNotificationGroup())}
                          onRemove={(index) => supportNotificationGroupsArray.remove(index)}
                        />

                        <NotificationGroupsSection
                          title="Grupos do Desenvolvimento"
                          description="Recebem tickets abertos com fila em Desenvolvimento."
                          fields={developmentNotificationGroupsArray.fields}
                          baseName="developmentNotificationGroups"
                          form={form}
                          onAdd={() => developmentNotificationGroupsArray.append(createNotificationGroup())}
                          onRemove={(index) => developmentNotificationGroupsArray.remove(index)}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
            <div className="sticky bottom-4 z-10 flex justify-end">
              <div className="rounded-xl border border-border/60 bg-background/95 p-2 shadow-lg backdrop-blur">
                <Button type="submit" disabled={isPending} className="h-10 gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isPending ? "Salvando" : "Salvar configuracoes"}
                </Button>
              </div>
            </div>
          </section>
        </form>
      </Form>
    </div>
  );
}

function CatalogList({ title, description, onAdd, children }: { title: string; description?: string; onAdd: () => void; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NotificationGroupsSection({
  title,
  description,
  fields,
  baseName,
  form,
  onAdd,
  onRemove,
}: {
  title: string;
  description: string;
  fields: Array<{ id: string }>;
  baseName: "supportNotificationGroups" | "developmentNotificationGroups";
  form: UseFormReturn<TicketModuleSettings>;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Grupo
        </Button>
      </div>

      <div className="space-y-2">
        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
            Nenhum grupo configurado.
          </div>
        ) : null}

        {fields.map((fieldItem, index) => (
          <div key={fieldItem.id} className="grid gap-3 rounded-lg border border-border/60 bg-background p-3 xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_6rem_2.5rem]">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Nome interno</p>
              <Input placeholder="Nome do grupo" {...form.register(`${baseName}.${index}.label`)} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">ID/JID do grupo</p>
              <Input placeholder="1203630...@g.us" {...form.register(`${baseName}.${index}.jid`)} />
            </div>
            <FormField
              control={form.control}
              name={`${baseName}.${index}.active`}
              render={({ field }) => (
                <FormItem className="flex h-10 items-center justify-between rounded-md border border-border/60 px-3">
                  <FormLabel className="text-xs">Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactOptionRow({
  form,
  labelName,
  valueName,
  labelPlaceholder,
  valuePlaceholder,
  onRemove,
}: {
  form: UseFormReturn<TicketModuleSettings>;
  labelName: FieldPath<TicketModuleSettings>;
  valueName: FieldPath<TicketModuleSettings>;
  labelPlaceholder: string;
  valuePlaceholder: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/10 p-2">
      <Input placeholder={labelPlaceholder} className="h-8 min-w-0 flex-1" {...form.register(labelName)} />
      <Input placeholder={valuePlaceholder} className="h-8 w-24 shrink-0 text-xs" {...form.register(valueName)} />
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ModuleOptionRow({
  form,
  labelName,
  valueName,
  labelPlaceholder,
  valuePlaceholder,
  onRemove,
}: {
  form: UseFormReturn<TicketModuleSettings>;
  labelName: FieldPath<TicketModuleSettings>;
  valueName: FieldPath<TicketModuleSettings>;
  labelPlaceholder: string;
  valuePlaceholder: string;
  onRemove: () => void;
}) {
  const labelValue = String(form.watch(labelName) ?? "");
  const depth = getModuleHierarchyDepth(labelValue);

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <FormField
          control={form.control}
          name={labelName}
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormControl>
                <Input
                  placeholder={labelPlaceholder}
                  className="h-8 min-w-0"
                  value={String(field.value ?? "")}
                  onChange={(event) => {
                    const nextLabel = event.target.value;
                    const previousAutoValue = buildModuleHierarchyValue(String(field.value ?? ""));
                    const currentValue = String(form.getValues(valueName) ?? "");

                    field.onChange(nextLabel);

                    if (!currentValue || currentValue === previousAutoValue) {
                      form.setValue(valueName, buildModuleHierarchyValue(nextLabel) as never, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  onBlur={(event) => {
                    const normalizedLabel = normalizeModuleHierarchyLabel(event.target.value);
                    field.onBlur();
                    if (normalizedLabel !== event.target.value) {
                      field.onChange(normalizedLabel);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem]">
        <Input placeholder={valuePlaceholder} className="h-8 text-xs" {...form.register(valueName)} />
        <div className="flex items-center rounded-md border border-border/60 px-2.5 text-[11px] text-muted-foreground">
          Nivel {depth + 1}
        </div>
      </div>
    </div>
  );
}

function LabeledNumberInput({ label, value, min, max, onChange }: { label: string; value: number | ""; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="relative">
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10) || min)}
        className="pr-16"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
