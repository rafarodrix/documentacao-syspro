"use client";

import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm, type FieldPath, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Clock,
  Layers3,
  Loader2,
  MessageSquareText,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  ticketModuleSettingsSchema,
  type TicketModuleSettings,
} from "@dosc-syspro/contracts/ticket";
import {
  SettingsMetricCard,
  SettingsPageIntro,
  SettingsTabsRail,
  SettingsTabsRailTrigger,
} from "@/app/(platform)/portal/configuracoes/settings-shell";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildModuleHierarchyValue, getModuleHierarchyDepth, normalizeModuleHierarchyLabel, sortTicketModuleOptions } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { invalidateTicketModuleSettingsCache } from "@/features/tickets/interface/hooks/use-ticket-module-settings";

function createOptionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
  return {
    ...settings,
    quickReplyTemplates: settings.quickReplyTemplates ?? DEFAULT_TICKET_MODULE_SETTINGS.quickReplyTemplates,
    categories: [...settings.categories].sort((left, right) => {
      const leftTeam = left.defaultTeam === "DESENVOLVIMENTO" ? 1 : 0;
      const rightTeam = right.defaultTeam === "DESENVOLVIMENTO" ? 1 : 0;
      if (leftTeam !== rightTeam) return leftTeam - rightTeam;
      return left.label.localeCompare(right.label, "pt-BR", { sensitivity: "base" });
    }),
    modules: sortTicketModuleOptions(
      settings.modules.map((moduleOption) => ({
        ...moduleOption,
        label: normalizeModuleHierarchyLabel(moduleOption.label) || moduleOption.label,
        value: moduleOption.value?.trim() || buildModuleHierarchyValue(moduleOption.label),
      })),
    ),
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

  const priorities = form.watch("priorities");

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

        invalidateTicketModuleSettingsCache(payload);
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
            <SettingsPageIntro
              icon={Layers3}
              eyebrow="Atendimento"
              title="Configuracoes de tickets"
              description="Ajuste catalogos, SLA e respostas rapidas usados no cadastro e na edicao de chamados."
              aside={
                <div className="grid gap-3 md:grid-cols-3">
                  <SettingsMetricCard
                    label="Estrutura"
                    value="Catalogos"
                    helper="Categorias, equipes e modulos do atendimento."
                  />
                  <SettingsMetricCard
                    label="SLA"
                    value={`${priorities.length} prioridades`}
                    helper="Tempos de primeira resposta e resolucao por faixa."
                  />
                  <SettingsMetricCard
                    label="Templates"
                    value="Respostas rapidas"
                    helper="Conteudo reutilizavel para o time operacional."
                  />
                </div>
              }
            />

            <Tabs defaultValue="structure" className="w-full">
              <SettingsTabsRail className="sm:grid-cols-3">
                <SettingsTabsRailTrigger
                  value="structure"
                  icon={Layers3}
                  title="Estrutura"
                  description="Padroes, categorias, equipes e modulos."
                />
                <SettingsTabsRailTrigger
                  value="sla"
                  icon={Clock}
                  title="SLA"
                  description="Politicas de resposta e resolucao por prioridade."
                />
                <SettingsTabsRailTrigger
                  value="templates"
                  icon={MessageSquareText}
                  title="Templates"
                  description="Respostas rapidas para o fluxo de atendimento."
                />
              </SettingsTabsRail>

              <TabsContent value="structure" className="mt-5 space-y-5">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Layers3 className="h-4 w-4 text-primary/70" />
                      Padroes operacionais
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

                <Tabs defaultValue="categories" className="w-full">
                  <SettingsTabsRail className="sm:grid-cols-3">
                    <SettingsTabsRailTrigger
                      value="categories"
                      icon={Layers3}
                      title="Categorias"
                      description="Roteamento e classificacao inicial."
                    />
                    <SettingsTabsRailTrigger
                      value="teams"
                      icon={Layers3}
                      title="Equipes"
                      description="Filas disponiveis para triagem."
                    />
                    <SettingsTabsRailTrigger
                      value="modules"
                      icon={Layers3}
                      title="Modulos"
                      description="Hierarquia usada no menu do Syspro."
                    />
                  </SettingsTabsRail>

                  <TabsContent value="categories" className="mt-5">
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <Layers3 className="h-4 w-4 text-primary/70" />
                              Categorias e roteamento
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Defina a equipe padrao e o tipo operacional de cada categoria.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() =>
                              categoriesArray.append({
                                id: createOptionId("cat"),
                                label: "",
                                value: "",
                                defaultTeam: "SUPORTE",
                                type: "SUPORTE",
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Categoria
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {categoriesArray.fields.map((fieldItem, index) => (
                          <div
                            key={fieldItem.id}
                            className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_11rem_12rem_2.5rem]"
                          >
                            <div className="space-y-2">
                              <FormField
                                control={form.control}
                                name={`categories.${index}.label`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl><Input placeholder="Nome da categoria" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`categories.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl><Input placeholder="Descricao operacional" className="h-8 text-xs" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name={`categories.${index}.value`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl><Input placeholder="slug" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`categories.${index}.defaultTeam`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      form.setValue(`categories.${index}.type`, value === "DESENVOLVIMENTO" ? "BUG" : "SUPORTE", {
                                        shouldDirty: true,
                                      });
                                    }}
                                    value={field.value || "SUPORTE"}
                                  >
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Fila" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="SUPORTE">Suporte</SelectItem>
                                      <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`categories.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {getCategoryTypeOptions(form.watch(`categories.${index}.defaultTeam`)).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              onClick={() => categoriesArray.remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="teams" className="mt-5">
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <Layers3 className="h-4 w-4 text-primary/70" />
                              Equipes
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Mantenha as filas disponiveis para triagem e roteamento dos tickets.
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => teamsArray.append({ id: createOptionId("team"), label: "", value: "" })}>
                            <Plus className="h-3.5 w-3.5" />
                            Equipe
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
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
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="modules" className="mt-5">
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <Layers3 className="h-4 w-4 text-primary/70" />
                              Modulos do Syspro
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              A lista segue a ordem do menu principal do Syspro. Use a hierarquia com {">"} para modulo, submenu e tela.
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => modulesArray.append({ id: createOptionId("mod"), label: "", value: "" })}>
                            <Plus className="h-3.5 w-3.5" />
                            Modulo
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
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
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
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
